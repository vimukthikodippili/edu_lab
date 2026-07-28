import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { MhaSessionEntity, MhaSessionStatus } from './entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { DisorderRegistryEntity, RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultEntity, DomainResultLevel } from '../domain-result/entities/domain-result.entity';
import { CreateMhaSessionDto } from './dto/create-mha-session.dto';
import { MhaConsentService } from '../mha-consent/mha-consent.service';
import { AuditService } from '../audit/audit.service';
import { RiskAggregationService } from '../risk-summary/risk-aggregation.service';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { RecommendedActionService } from '../session-action/recommended-action.service';
import { SessionActionStatus } from '../session-action/entities/session-action.entity';
import { TopFindingsService, TopFinding } from '../top-findings/top-findings.service';

export interface MhaSessionWithDomains {
  session: MhaSessionEntity;
  studentAge: number;
  domains: DisorderRegistryEntity[];
}

export interface MhaSessionListItem {
  id: string;
  caseNumber: string;
  studentId: string;
  studentName: string;
  counselorStaffId: string;
  screeningDate: string;
  status: MhaSessionStatus;
  createdAt: Date;
  updatedAt: Date;
  topFindings: TopFinding[];
}

export interface SessionActionSummary {
  id: string;
  actionText: string;
  status: SessionActionStatus;
  completedAt: Date | null;
  completedByStaffId: string | null;
  completionNote: string | null;
}

/** MHA-124 — the full session-summary DTO returned by completeSession() and getSessionSummary().
 * `age`/`grade` are computed/formatted at read time from the linked Student, never persisted.
 * MHA-131 — `recommendedActions` carries each action's `id`/`status` (not just its text) so the
 * counselor can toggle open/complete per action (FR-MHA-32) using a stable identifier. */
export interface MhaSessionSummaryDto {
  id: string;
  caseNumber: string;
  studentId: string;
  studentName: string;
  age: number;
  grade: string;
  screeningDate: string;
  status: MhaSessionStatus;
  completedAt: Date | null;
  riskCategories: { category: RiskCategory; level: DomainResultLevel }[];
  topFindings: TopFinding[];
  recommendedActions: SessionActionSummary[];
}

const CASE_NUMBER_UNIQUE_VIOLATION = '23505';
const MAX_CASE_NUMBER_ATTEMPTS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const AVERAGE_DAYS_PER_YEAR = 365.25;

/** FR-MHA-03/05/07/AC#10-14 — session creation shell. Age-based domain filtering and case-number
 * generation are pure/reusable so the frontend "on student selection" preview (AC #11/#12) and
 * the actual create step share one implementation. */
@Injectable()
export class MhaSessionService {
  private readonly logger = new Logger(MhaSessionService.name);

  /** MHA-123 — sentinel actorId for audit entries written by the automated abandonment sweep,
   * not a human user. `AuditLogEntity.actorId` is a plain `uuid` column with no FK constraint,
   * but Postgres still requires valid UUID syntax — the nil UUID is a clear, unambiguous
   * "system, not a person" marker in any audit review. No prior cron job in this codebase
   * audit-logs, so this is a new convention, established here deliberately. */
  private readonly SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

  constructor(
    @InjectRepository(MhaSessionEntity)
    private readonly sessionRepo: Repository<MhaSessionEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(DisorderRegistryEntity)
    private readonly registryRepo: Repository<DisorderRegistryEntity>,

    @InjectRepository(DomainResultEntity)
    private readonly domainResultRepo: Repository<DomainResultEntity>,

    private readonly dataSource: DataSource,
    private readonly mhaConsentService: MhaConsentService,
    private readonly auditService: AuditService,
    private readonly riskAggregationService: RiskAggregationService,
    private readonly recommendedActionService: RecommendedActionService,
    private readonly topFindingsService: TopFindingsService,
  ) {}

  /** AI prompt's literal formula: floor((screeningDate - DOB) / 365.25 days) — not a
   * calendar-aware "years since last birthday" calculation. Boundary tests are written against
   * this exact formula, so it must match precisely. `dateOfBirth` accepts `Date | string` since
   * StudentEntity declares it as `Date` at compile time, but a plain `date`-typed Postgres column
   * comes back from the driver as a plain 'YYYY-MM-DD' string at runtime. */
  private computeAge(dateOfBirth: Date | string, screeningDate: string): number {
    const dobIso = dateOfBirth instanceof Date ? dateOfBirth.toISOString().slice(0, 10) : dateOfBirth;
    const dobMs = new Date(`${dobIso}T00:00:00.000Z`).getTime();
    const screeningMs = new Date(`${screeningDate}T00:00:00.000Z`).getTime();
    const ageInDays = (screeningMs - dobMs) / MS_PER_DAY;
    return Math.floor(ageInDays / AVERAGE_DAYS_PER_YEAR);
  }

  private async findAgeFilteredDomains(studentId: string, screeningDate: string) {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`);
    }

    const studentAge = this.computeAge(student.dateOfBirth, screeningDate);

    const domains = await this.registryRepo
      .createQueryBuilder('d')
      .where('d.isActive = true')
      .andWhere('d.ageMin <= :age', { age: studentAge })
      .andWhere('d.ageMax >= :age', { age: studentAge })
      .orderBy('d.section', 'ASC')
      .addOrderBy('d.name', 'ASC')
      .getMany();

    return { student, studentAge, domains };
  }

  async previewDomains(
    studentId: string,
    screeningDate?: string,
  ): Promise<{ studentAge: number; domains: DisorderRegistryEntity[] }> {
    const date = screeningDate ?? new Date().toISOString().slice(0, 10);
    const { studentAge, domains } = await this.findAgeFilteredDomains(studentId, date);
    return { studentAge, domains };
  }

  async createSession(
    dto: CreateMhaSessionDto,
    counselorStaffId: string,
  ): Promise<MhaSessionWithDomains> {
    const { studentAge, domains } = await this.findAgeFilteredDomains(dto.studentId, dto.screeningDate);

    // AC #10 — the actual FR-MHA-01/MHA-111 wiring: propagates a real 409 if no consent exists.
    await this.mhaConsentService.assertConsentExists(dto.studentId);

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CASE_NUMBER_ATTEMPTS; attempt++) {
      const caseNumber = await this.generateCaseNumber(dto.screeningDate);
      try {
        const session = await this.dataSource.transaction(async (manager) => {
          const created = manager.create(MhaSessionEntity, {
            caseNumber,
            studentId: dto.studentId,
            counselorStaffId,
            screeningDate: dto.screeningDate,
            status: MhaSessionStatus.DRAFT,
          });
          const savedSession = await manager.save(MhaSessionEntity, created);

          // MHA-120 — pre-create one DomainResult row ('not_assessed') per filtered domain, in
          // the same transaction as the session insert. Domains are fixed at creation time from
          // the immutable screeningDate, so this runs once here, not re-derived on every view.
          if (domains.length > 0) {
            await manager.save(
              DomainResultEntity,
              domains.map((d) =>
                manager.create(DomainResultEntity, {
                  sessionId: savedSession.id,
                  domainId: d.id,
                  level: DomainResultLevel.NOT_ASSESSED,
                }),
              ),
            );
          }

          return savedSession;
        });

        await this.auditService.log({
          actorId: counselorStaffId,
          action: 'create_session',
          targetType: 'mha_session',
          targetId: session.id,
        });

        return { session, studentAge, domains };
      } catch (error) {
        lastError = error;
        if (!this.isCaseNumberCollision(error)) {
          throw error;
        }
        // Collision on caseNumber under concurrent creation — regenerate and retry.
      }
    }

    throw lastError;
  }

  async getSessionById(id: string): Promise<MhaSessionEntity> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException(`MHA session ${id} not found.`);
    }
    return session;
  }

  /** MHA-123 — AC #2/#4/#5. Not scoped to the calling counselor — matches
   * CounselorCaseService.findCases(status?)'s precedent of an optional-filter, all-rows list.
   * MHA-124 — AC #5 adds an optional studentId filter so a completed session "appears in the
   * student's MHA history" via this same list, rather than a new dedicated history endpoint. */
  async listSessions(status?: MhaSessionStatus, studentId?: string): Promise<MhaSessionListItem[]> {
    const where: FindOptionsWhere<MhaSessionEntity> = {};
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    const sessions = await this.sessionRepo.find({
      where,
      order: { updatedAt: 'DESC' },
    });
    if (sessions.length === 0) {
      return [];
    }

    const studentIds = [...new Set(sessions.map((s) => s.studentId))];
    const students = await this.studentRepo.find({ where: { id: In(studentIds) } });
    const nameById = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

    return sessions.map((s) => ({
      id: s.id,
      caseNumber: s.caseNumber,
      studentId: s.studentId,
      studentName: nameById.get(s.studentId) ?? 'Unknown Student',
      counselorStaffId: s.counselorStaffId,
      screeningDate: s.screeningDate,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      // MHA-132/AC #62 — read straight off the denormalized snapshot, no join.
      topFindings: s.topFindingsSnapshot,
    }));
  }

  /** MHA-123 — AC #4. Explicit, distinct action from saving a draft (FR-MHA-13 autosave already
   * happens continuously via DomainResultService.update()). Validates AC #4a (at least one
   * assessed domain) — AC #4b (no blank required header fields) is satisfied by construction,
   * since studentId/counselorStaffId/screeningDate are already NOT NULL DB columns enforced at
   * createSession() time; no other nullable header field exists on this entity.
   * MHA-124 — AC #2/#4/#5. Triggers the real MHA-130 (RiskAggregationService) and MHA-131
   * (RecommendedActionService) work here, replacing the prior log-only stub. Domain-result rows
   * are fetched exactly once (joined with `.domain` for riskCategory/name) and passed to both
   * services — neither queries the DB itself, avoiding two redundant fetches of the same rows. */
  async completeSession(id: string, actorId: string): Promise<MhaSessionSummaryDto> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException(`MHA session ${id} not found.`);
    }
    if (session.status !== MhaSessionStatus.DRAFT) {
      throw new ConflictException(`Session ${id} is not in draft status.`);
    }

    const domainRows = await this.domainResultRepo.find({
      where: { sessionId: id },
      relations: ['domain'],
    });
    const assessedCount = domainRows.filter((r) => r.level !== DomainResultLevel.NOT_ASSESSED).length;
    if (assessedCount === 0) {
      throw new UnprocessableEntityException(
        'At least one domain must be assessed before completing the session.',
      );
    }

    // MHA-132/AC #62 — computed before the single save below so the snapshot rides along with the
    // status/completedAt write, rather than a second UPDATE.
    session.topFindingsSnapshot = this.topFindingsService.compute(
      domainRows.map((r) => ({
        level: r.level,
        domainName: r.domain.name,
        section: r.domain.section,
        riskCategory: r.domain.riskCategory,
      })),
    );
    session.status = MhaSessionStatus.COMPLETE;
    session.completedAt = new Date();
    const saved = await this.sessionRepo.save(session);

    await this.auditService.log({
      actorId,
      action: 'complete_session',
      targetType: 'mha_session',
      targetId: saved.id,
    });

    const forAggregation = domainRows.map((r) => ({
      level: r.level,
      domainName: r.domain.name,
      riskCategory: r.domain.riskCategory,
      safetyFlagRaised: r.safetyFlagRaised,
    }));
    const { riskSummaries } = await this.riskAggregationService.aggregate(saved.id, forAggregation);
    const hasSafetyFlag = domainRows.some((r) => r.safetyFlagRaised);
    const actions = await this.recommendedActionService.generate(saved.id, riskSummaries, hasSafetyFlag);

    await this.auditService.log({
      actorId,
      action: 'generate_summary',
      targetType: 'mha_session',
      targetId: saved.id,
    });

    return this.buildSummaryDto(
      saved,
      riskSummaries,
      saved.topFindingsSnapshot,
      actions.map((a) => ({
        id: a.id,
        actionText: a.actionText,
        status: a.status,
        completedAt: a.completedAt,
        completedByStaffId: a.completedByStaffId,
        completionNote: a.completionNote,
      })),
    );
  }

  /** MHA-124 — FR-MHA-26 "permanent, retrievable record." Lets a counselor re-view a completed
   * session's summary later, not just once at completion. The empty-riskSummaries 404 uniformly
   * covers draft and abandoned sessions (neither has ever completed, so neither has rows) without
   * a separate status branch.
   * MHA-132 — no longer re-queries DomainResult to recompute Top Findings; reads the persisted
   * `topFindingsSnapshot` directly off the already-fetched session (AC #62, "for fast retrieval"). */
  async getSessionSummary(id: string): Promise<MhaSessionSummaryDto> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException(`MHA session ${id} not found.`);
    }
    const riskSummaries = await this.riskAggregationService.getPersistedSummary(id);
    if (riskSummaries.length === 0) {
      throw new NotFoundException(`No summary exists for session ${id}.`);
    }
    const actions = await this.recommendedActionService.getPersistedActions(id);

    return this.buildSummaryDto(
      session,
      riskSummaries,
      session.topFindingsSnapshot,
      actions.map((a) => ({
        id: a.id,
        actionText: a.actionText,
        status: a.status,
        completedAt: a.completedAt,
        completedByStaffId: a.completedByStaffId,
        completionNote: a.completionNote,
      })),
    );
  }

  private async buildSummaryDto(
    session: MhaSessionEntity,
    riskSummaries: RiskSummaryEntity[],
    topFindings: TopFinding[],
    recommendedActions: SessionActionSummary[],
  ): Promise<MhaSessionSummaryDto> {
    const student = await this.studentRepo.findOne({ where: { id: session.studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${session.studentId} not found.`);
    }
    return {
      id: session.id,
      caseNumber: session.caseNumber,
      studentId: session.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      age: this.computeAge(student.dateOfBirth, session.screeningDate),
      grade: `${student.grade.level}${student.classSection.name}`,
      screeningDate: session.screeningDate,
      status: session.status,
      completedAt: session.completedAt,
      riskCategories: riskSummaries.map((s) => ({ category: s.riskCategory, level: s.level })),
      topFindings,
      recommendedActions,
    };
  }

  /** MHA-123 — AC #3, FR-MHA-13. Runs hourly (a new pattern for this codebase — every other
   * @Cron job here is a fixed daily/weekly/monthly digest; a daily-only check could leave a
   * session abandoned up to ~24h past the 48h target). The 48h clock is TRUE last activity —
   * GREATEST(session.updatedAt, MAX(domain_result.updatedAt) for that session) — not a literal
   * session.updatedAt read, since nothing else in this codebase ever touches the parent session
   * row when a child DomainResult is edited (confirmed: DomainResultService.update() only ever
   * saves domainResultRepo). A literal session.updatedAt check would abandon nearly every
   * session ~48h after creation regardless of real activity. Single raw UPDATE with a correlated
   * subquery — one atomic statement, no fetch-then-loop-then-save round trip. */
  @Cron('0 * * * *')
  async abandonStaleDrafts(): Promise<number> {
    const result = await this.sessionRepo.query(
      `UPDATE "mha_session" AS s
       SET "status" = 'abandoned', "updatedAt" = now()
       WHERE s."status" = 'draft'
         AND GREATEST(
               s."updatedAt",
               COALESCE(
                 (SELECT MAX(dr."updatedAt") FROM "domain_result" dr WHERE dr."sessionId" = s."id"),
                 s."updatedAt"
               )
             ) < now() - interval '48 hours'
       RETURNING s."id"`,
    );
    const abandonedIds: string[] = result[0].map((r: { id: string }) => r.id);

    for (const id of abandonedIds) {
      await this.auditService.log({
        actorId: this.SYSTEM_ACTOR_ID,
        action: 'abandon_session',
        targetType: 'mha_session',
        targetId: id,
      });
    }

    this.logger.log(`Draft abandonment sweep: ${abandonedIds.length} session(s) abandoned.`);
    return abandonedIds.length;
  }

  private isCaseNumberCollision(error: unknown): boolean {
    const code = (error as { code?: string; driverError?: { code?: string } })?.code
      ?? (error as { driverError?: { code?: string } })?.driverError?.code;
    return code === CASE_NUMBER_UNIQUE_VIOLATION;
  }

  /** Format: SC-YYYYMMDD-NNN, sequence resets daily (the date is embedded in the prefix). Query
   * max-for-prefix then increment — same shape as StaffService.generateEmployeeNumber() /
   * StudentsService.generateAdmissionNumber(), but the caller wraps this in a retry loop on a
   * unique-constraint collision, which those two precedents deliberately do not. */
  private async generateCaseNumber(screeningDate: string): Promise<string> {
    const datePart = screeningDate.replace(/-/g, '');
    const prefix = `SC-${datePart}-`;

    const last = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.caseNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.caseNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (last) {
      const seq = parseInt(last.caseNumber.slice(prefix.length), 10);
      sequence = isNaN(seq) ? 1 : seq + 1;
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }
}
