import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportEntity } from './entities/sport.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SportEnrollmentEntity } from './entities/sport-enrollment.entity';
import { MatchEntity, MatchType, TeamResult } from './entities/match.entity';
import { TrainingSessionEntity } from './entities/training-session.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { UpdateTrainingSessionDto } from './dto/update-training-session.dto';

export interface SportRosterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  enrolledAt: Date;
}

export interface SportDirectoryRow {
  id: string;
  name: string;
  sportType: { id: string; name: string };
  seasonStart: Date;
  seasonEnd: Date;
  coach: { id: string; firstName: string; lastName: string } | null;
  rosterCount: number;
}

@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(SportEntity)
    private readonly sportRepo: Repository<SportEntity>,

    @InjectRepository(SportTypeEntity)
    private readonly sportTypeRepo: Repository<SportTypeEntity>,

    @InjectRepository(SportEnrollmentEntity)
    private readonly enrollmentRepo: Repository<SportEnrollmentEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,

    @InjectRepository(TrainingSessionEntity)
    private readonly trainingSessionRepo: Repository<TrainingSessionEntity>,
  ) {}

  /** Privileged roles (admin/principal/section_head) may manage any sport; a non-privileged
   * caller (a coach) may only act on the sport(s) they are personally assigned to — mirrors
   * subject-topics.service.ts's single-record ownership check exactly. */
  private assertAuthorized(sport: SportEntity, staffId: string, isPrivileged: boolean): void {
    if (isPrivileged) return;
    if (sport.coachId === staffId) return;
    throw new ForbiddenException('You are not the coach for this sport.');
  }

  /** Match creation/edit is deliberately narrower than the general sport-management privilege
   * above — Section Head can VIEW matches (uses assertAuthorized) but cannot create/edit them,
   * per the story's explicit "the Coach assigned to that Sport (and Principal/Admin)" access
   * rule. The caller (isMatchManager) is already computed against a role set that excludes
   * section_head; this re-checks the same coachId ownership rule for a non-privileged caller. */
  private assertMatchManagementAuthorized(
    sport: SportEntity,
    staffId: string,
    isMatchManager: boolean,
  ): void {
    if (isMatchManager) return;
    if (sport.coachId === staffId) return;
    throw new ForbiddenException('You are not the coach for this sport.');
  }

  /** Public wrappers so other services (PerformanceService) can reuse this module's own
   * ownership rules instead of re-deriving them — the one deliberate departure from this
   * session's "every service carries its own copy" convention, since duplicating an
   * authorization rule (as opposed to a generic validation helper) is a real correctness risk
   * if the rule ever changes in one place and not the other. */
  async resolveSportForViewing(
    sportId: string,
    staffId: string,
    isPrivilegedViewer: boolean,
  ): Promise<SportEntity> {
    const sport = await this.findById(sportId);
    this.assertAuthorized(sport, staffId, isPrivilegedViewer);
    return sport;
  }

  async resolveSportForMatchManagement(
    sportId: string,
    staffId: string,
    isMatchManager: boolean,
  ): Promise<SportEntity> {
    const sport = await this.findById(sportId);
    this.assertMatchManagementAuthorized(sport, staffId, isMatchManager);
    return sport;
  }

  private assertValidSeasonDates(seasonStart: string, seasonEnd: string): void {
    if (new Date(seasonEnd) < new Date(seasonStart)) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { seasonEnd: 'Season end date must be on or after the season start date.' },
      });
    }
  }

  private async assertCoachExists(coachId: string): Promise<void> {
    const coach = await this.staffRepo.findOne({ where: { id: coachId } });
    if (!coach) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { coachId: `Staff member ${coachId} not found.` },
      });
    }
  }

  /** DTO-level @IsUUID already rejects a malformed sportTypeId at the HTTP boundary; re-checked
   * here as defense-in-depth in case a caller bypasses HTTP validation, matching this codebase's
   * established convention (e.g. AssessmentService.validateAndResolveAllocations) — now a DB
   * existence check instead of an enum-membership check, since sport types are admin-managed
   * data, not a fixed code-level list. */
  private async assertSportTypeExists(sportTypeId: string): Promise<void> {
    const exists = await this.sportTypeRepo.findOne({ where: { id: sportTypeId } });
    if (!exists) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { sportTypeId: `Sport type ${sportTypeId} not found.` },
      });
    }
  }

  async create(dto: CreateSportDto): Promise<SportEntity> {
    await this.assertSportTypeExists(dto.sportTypeId);
    await this.assertCoachExists(dto.coachId);
    this.assertValidSeasonDates(dto.seasonStart, dto.seasonEnd);

    const sport = this.sportRepo.create({
      name: dto.name,
      sportTypeId: dto.sportTypeId,
      seasonStart: new Date(dto.seasonStart + 'T00:00:00Z') as unknown as Date,
      seasonEnd: new Date(dto.seasonEnd + 'T00:00:00Z') as unknown as Date,
      description: dto.description ?? null,
      coachId: dto.coachId,
    });
    return this.sportRepo.save(sport);
  }

  /** FR-P3-AV-02: a Section Head only sees sports with an active enrolled student inside their
   * own configured grade range — a fully privileged caller (admin/principal) is unfiltered, same
   * as before this story. Mirrors late-alert.service.ts's fail-closed convention exactly: an
   * unconfigured range (sectionHeadGradeFrom/To null on their own StaffEntity) means nothing is
   * visible, never "unfiltered." A caller that's neither fully privileged nor a section head
   * (shouldn't happen — RolesGuard already restricts this route) also sees nothing, defensively. */
  async findAll(
    staffId: string,
    isFullyPrivileged: boolean,
    isSectionHead: boolean,
  ): Promise<SportEntity[]> {
    if (isFullyPrivileged) {
      return this.sportRepo.find({ order: { name: 'ASC' } });
    }
    if (!isSectionHead) return [];

    const range = await this.resolveSectionHeadGradeRange(staffId);
    if (!range) return [];

    const sports = await this.sportRepo.find({ order: { name: 'ASC' } });
    if (sports.length === 0) return [];

    const inRangeSportIds = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoin('e.student', 's')
      .innerJoin('s.grade', 'g')
      .select('DISTINCT e.sportId', 'sportId')
      .where('e.sportId IN (:...ids)', { ids: sports.map((s) => s.id) })
      .andWhere('s.status = :status', { status: StudentStatus.ACTIVE })
      .andWhere('g.level BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getRawMany<{ sportId: string }>();
    const allowedIds = new Set(inRangeSportIds.map((r) => r.sportId));

    return sports.filter((s) => allowedIds.has(s.id));
  }

  /** Same fail-closed convention as findAll() above, scoped to a single sport — the
   * controller-level check reused by every single-sport view route (roster, matches, training
   * sessions, performance entry/trends) so a Section Head can't reach a specific sportId they
   * already know about just because it wasn't in their filtered list view. */
  async isSportViewableBySectionHead(sportId: string, staffId: string): Promise<boolean> {
    const range = await this.resolveSectionHeadGradeRange(staffId);
    if (!range) return false;

    const match = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoin('e.student', 's')
      .innerJoin('s.grade', 'g')
      .where('e.sportId = :sportId', { sportId })
      .andWhere('s.status = :status', { status: StudentStatus.ACTIVE })
      .andWhere('g.level BETWEEN :from AND :to', { from: range.from, to: range.to })
      .getOne();

    return !!match;
  }

  private async resolveSectionHeadGradeRange(
    staffId: string,
  ): Promise<{ from: number; to: number } | null> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    if (staff?.sectionHeadGradeFrom == null || staff?.sectionHeadGradeTo == null) {
      return null;
    }
    return { from: staff.sectionHeadGradeFrom, to: staff.sectionHeadGradeTo };
  }

  /** FR-P3-AV-03: a Coach can only view/enter data for their own sport(s) — but nothing
   * else in this module lets a non-privileged caller discover which sport(s) that is
   * (findAll() is admin/principal/section_head only). Without this, the roster routes
   * below are unreachable for a real coach. */
  async findByCoach(staffId: string): Promise<SportEntity[]> {
    return this.sportRepo.find({ where: { coachId: staffId }, order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<SportEntity> {
    const sport = await this.sportRepo.findOne({ where: { id } });
    if (!sport) throw new NotFoundException(`Sport ${id} not found.`);
    return sport;
  }

  /** FR-P3-AV-05/06: the reverse direction of getRoster's enrollment query — every existing
   * enrollment lookup goes sportId -> students; a student's own self-view needs studentId ->
   * sports, which nothing in this module has needed until now. No authorization check here —
   * a student's own enrollments are inherently theirs to see; access control is enforced once,
   * at the self-view controller layer, before this is ever called. */
  async findEnrolledSports(studentId: string): Promise<SportEntity[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { studentId },
      relations: ['sport'],
    });
    return enrollments.map((e) => e.sport).sort((a, b) => a.name.localeCompare(b.name));
  }

  async update(id: string, dto: UpdateSportDto): Promise<SportEntity> {
    const sport = await this.findById(id);

    if (dto.sportTypeId !== undefined) {
      // update() previously assigned sportType with no existence re-check at all (a real,
      // pre-existing gap vs. create()'s defense-in-depth pattern) — closed here while already
      // touching this line for the enum-to-table conversion.
      await this.assertSportTypeExists(dto.sportTypeId);
      sport.sportTypeId = dto.sportTypeId;
    }

    if (dto.coachId !== undefined) {
      await this.assertCoachExists(dto.coachId);
      sport.coachId = dto.coachId;
    }

    if (dto.seasonStart !== undefined || dto.seasonEnd !== undefined) {
      const seasonStart = dto.seasonStart ?? sport.seasonStart.toString();
      const seasonEnd = dto.seasonEnd ?? sport.seasonEnd.toString();
      this.assertValidSeasonDates(seasonStart, seasonEnd);
      if (dto.seasonStart !== undefined) {
        sport.seasonStart = new Date(dto.seasonStart + 'T00:00:00Z') as unknown as Date;
      }
      if (dto.seasonEnd !== undefined) {
        sport.seasonEnd = new Date(dto.seasonEnd + 'T00:00:00Z') as unknown as Date;
      }
    }

    if (dto.name !== undefined) sport.name = dto.name;
    if (dto.description !== undefined) sport.description = dto.description;

    return this.sportRepo.save(sport);
  }

  async getRoster(
    sportId: string,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<{ sport: SportEntity; roster: SportRosterRow[] }> {
    const sport = await this.findById(sportId);
    this.assertAuthorized(sport, staffId, isPrivileged);

    const enrollments = await this.enrollmentRepo.find({
      where: { sportId },
      relations: ['student'],
      order: { enrolledAt: 'ASC' },
    });

    const roster: SportRosterRow[] = enrollments
      .filter((e) => e.student.status === StudentStatus.ACTIVE)
      .map((e) => ({
        studentId: e.studentId,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        admissionNumber: e.student.admissionNumber,
        enrolledAt: e.enrolledAt,
      }));

    return { sport, roster };
  }

  async enrollStudent(
    sportId: string,
    dto: EnrollStudentDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<SportEnrollmentEntity> {
    const sport = await this.findById(sportId);
    this.assertAuthorized(sport, staffId, isPrivileged);

    const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { studentId: `Student ${dto.studentId} not found.` },
      });
    }

    const existing = await this.enrollmentRepo.findOne({
      where: { sportId, studentId: dto.studentId },
    });
    if (existing) {
      throw new ConflictException('This student is already enrolled in this sport.');
    }

    const enrollment = this.enrollmentRepo.create({ sportId, studentId: dto.studentId });
    return this.enrollmentRepo.save(enrollment);
  }

  async removeFromRoster(
    sportId: string,
    studentId: string,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    const sport = await this.findById(sportId);
    this.assertAuthorized(sport, staffId, isPrivileged);

    const enrollment = await this.enrollmentRepo.findOne({ where: { sportId, studentId } });
    if (!enrollment) {
      throw new NotFoundException('This student is not enrolled in this sport.');
    }
    await this.enrollmentRepo.remove(enrollment);
  }

  async getDirectory(): Promise<SportDirectoryRow[]> {
    const sports = await this.sportRepo.find({ order: { name: 'ASC' } });
    if (sports.length === 0) return [];

    const counts = await this.enrollmentRepo
      .createQueryBuilder('e')
      .select('e.sportId', 'sportId')
      .addSelect('COUNT(*)', 'count')
      .where('e.sportId IN (:...ids)', { ids: sports.map((s) => s.id) })
      .groupBy('e.sportId')
      .getRawMany<{ sportId: string; count: string }>();
    const countBySportId = new Map(counts.map((c) => [c.sportId, Number(c.count)]));

    return sports.map((s) => ({
      id: s.id,
      name: s.name,
      sportType: s.sportType,
      seasonStart: s.seasonStart,
      seasonEnd: s.seasonEnd,
      coach: s.coach
        ? { id: s.coach.id, firstName: s.coach.firstName, lastName: s.coach.lastName }
        : null,
      rosterCount: countBySportId.get(s.id) ?? 0,
    }));
  }

  async createMatch(
    sportId: string,
    dto: CreateMatchDto,
    staffId: string,
    isMatchManager: boolean,
  ): Promise<MatchEntity> {
    const sport = await this.findById(sportId);
    this.assertMatchManagementAuthorized(sport, staffId, isMatchManager);

    // DTO-level @IsEnum already rejects an invalid enum value at the HTTP boundary;
    // re-checked here as defense-in-depth, matching create()'s existing sportType re-check.
    if (!Object.values(MatchType).includes(dto.matchType)) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { matchType: `"${dto.matchType}" is not a recognized match type.` },
      });
    }
    if (dto.teamResult && !Object.values(TeamResult).includes(dto.teamResult)) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { teamResult: `"${dto.teamResult}" is not a recognized team result.` },
      });
    }

    const match = this.matchRepo.create({
      sportId,
      date: new Date(dto.date + 'T00:00:00Z') as unknown as Date,
      opponent: dto.opponent ?? null,
      venue: dto.venue,
      matchType: dto.matchType,
      teamResult: dto.teamResult ?? TeamResult.NO_RESULT,
      teamScore: dto.teamScore ?? null,
      notes: dto.notes ?? null,
      loggedByStaffId: staffId,
    });
    return this.matchRepo.save(match);
  }

  async updateMatch(
    matchId: string,
    dto: UpdateMatchDto,
    staffId: string,
    isMatchManager: boolean,
  ): Promise<MatchEntity> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found.`);

    const sport = await this.findById(match.sportId);
    this.assertMatchManagementAuthorized(sport, staffId, isMatchManager);

    if (dto.date !== undefined) match.date = new Date(dto.date + 'T00:00:00Z') as unknown as Date;
    if (dto.opponent !== undefined) match.opponent = dto.opponent;
    if (dto.venue !== undefined) match.venue = dto.venue;
    if (dto.matchType !== undefined) match.matchType = dto.matchType;
    if (dto.teamResult !== undefined) match.teamResult = dto.teamResult;
    if (dto.teamScore !== undefined) match.teamScore = dto.teamScore;
    if (dto.notes !== undefined) match.notes = dto.notes;

    return this.matchRepo.save(match);
  }

  async findMatches(
    sportId: string,
    staffId: string,
    isPrivilegedViewer: boolean,
  ): Promise<MatchEntity[]> {
    const sport = await this.findById(sportId);
    this.assertAuthorized(sport, staffId, isPrivilegedViewer);

    return this.matchRepo.find({ where: { sportId }, order: { date: 'DESC' } });
  }

  /** Every attendee must actually be on this sport's roster, and a designated leader must be
   * one of the attendees — a leader who didn't attend makes no sense. */
  private async assertValidAttendance(
    sportId: string,
    attendeeStudentIds: string[],
    sessionLeaderStudentId: string | undefined,
  ): Promise<void> {
    const enrollments = await this.enrollmentRepo.find({ where: { sportId } });
    const enrolledIds = new Set(enrollments.map((e) => e.studentId));

    const nonEnrolled = attendeeStudentIds.filter((id) => !enrolledIds.has(id));
    if (nonEnrolled.length > 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          attendeeStudentIds: `${nonEnrolled.length} student(s) are not enrolled on this sport's roster.`,
        },
      });
    }

    if (sessionLeaderStudentId && !attendeeStudentIds.includes(sessionLeaderStudentId)) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { sessionLeaderStudentId: 'The session leader must be one of the attendees.' },
      });
    }
  }

  async createTrainingSession(
    sportId: string,
    dto: CreateTrainingSessionDto,
    staffId: string,
    isMatchManager: boolean,
  ): Promise<TrainingSessionEntity> {
    const sport = await this.findById(sportId);
    this.assertMatchManagementAuthorized(sport, staffId, isMatchManager);
    await this.assertValidAttendance(sportId, dto.attendeeStudentIds, dto.sessionLeaderStudentId);

    const session = this.trainingSessionRepo.create({
      sportId,
      date: new Date(dto.date + 'T00:00:00Z') as unknown as Date,
      description: dto.description,
      attendeeStudentIds: dto.attendeeStudentIds,
      sessionLeaderStudentId: dto.sessionLeaderStudentId ?? null,
      loggedByStaffId: staffId,
    });
    return this.trainingSessionRepo.save(session);
  }

  async updateTrainingSession(
    sessionId: string,
    dto: UpdateTrainingSessionDto,
    staffId: string,
    isMatchManager: boolean,
  ): Promise<TrainingSessionEntity> {
    const session = await this.trainingSessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Training session ${sessionId} not found.`);

    const sport = await this.findById(session.sportId);
    this.assertMatchManagementAuthorized(sport, staffId, isMatchManager);

    const nextAttendees = dto.attendeeStudentIds ?? session.attendeeStudentIds;
    const nextLeader =
      dto.sessionLeaderStudentId !== undefined
        ? dto.sessionLeaderStudentId
        : (session.sessionLeaderStudentId ?? undefined);
    if (dto.attendeeStudentIds !== undefined || dto.sessionLeaderStudentId !== undefined) {
      await this.assertValidAttendance(session.sportId, nextAttendees, nextLeader);
    }

    if (dto.date !== undefined) session.date = new Date(dto.date + 'T00:00:00Z') as unknown as Date;
    if (dto.description !== undefined) session.description = dto.description;
    if (dto.attendeeStudentIds !== undefined) session.attendeeStudentIds = dto.attendeeStudentIds;
    if (dto.sessionLeaderStudentId !== undefined) {
      session.sessionLeaderStudentId = dto.sessionLeaderStudentId;
    }

    return this.trainingSessionRepo.save(session);
  }

  async findTrainingSessions(
    sportId: string,
    staffId: string,
    isPrivilegedViewer: boolean,
  ): Promise<TrainingSessionEntity[]> {
    const sport = await this.findById(sportId);
    this.assertAuthorized(sport, staffId, isPrivilegedViewer);

    return this.trainingSessionRepo.find({ where: { sportId }, order: { date: 'DESC' } });
  }
}
