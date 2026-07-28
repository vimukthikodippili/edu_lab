import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { MhaSessionEntity, MhaSessionStatus } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { SEVERITY_RANK } from '../risk-summary/risk-aggregation.service';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StudentTimelineResponseDto, TimelineEventDto } from './dto/timeline-event.dto';

// FR-MHA-28/AC #88/91 — the only roles that ever see mha_session events on the timeline. Every
// other role reaching this endpoint (Admin, Section Head, Teacher, Guardian) gets a 200 with
// mha_session events filtered out, not a 403 — the route itself stays broadly accessible so this
// filtering is provably in-service, not just route-level gating.
const MHA_SESSION_VISIBLE_ROLES = new Set<number>([
  RoleEnum.counselor,
  RoleEnum.school_psychologist,
  RoleEnum.principal,
]);

@Injectable()
export class StudentTimelineService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(MhaSessionEntity)
    private readonly sessionRepo: Repository<MhaSessionEntity>,

    @InjectRepository(RiskSummaryEntity)
    private readonly riskSummaryRepo: Repository<RiskSummaryEntity>,
  ) {}

  async getTimeline(studentId: string, callerRoleId: number): Promise<StudentTimelineResponseDto> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`);
    }

    const events: TimelineEventDto[] = MHA_SESSION_VISIBLE_ROLES.has(callerRoleId)
      ? await this.buildMhaSessionEvents(studentId)
      : [];

    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    return { studentId, events };
  }

  // MHA-141 already found and fixed a legacy status='complete' session with a null completedAt
  // (pre-dates risk aggregation, zero RiskSummary rows) — the same completedAt IS NOT NULL guard
  // is reused here to avoid reintroducing that exact bug in a second place.
  private async buildMhaSessionEvents(studentId: string): Promise<TimelineEventDto[]> {
    const sessions = await this.sessionRepo.find({
      where: { studentId, status: MhaSessionStatus.COMPLETE, completedAt: Not(IsNull()) },
    });
    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((s) => s.id);
    const riskSummaries = await this.riskSummaryRepo.find({ where: { sessionId: In(sessionIds) } });

    const maxLevelBySession = new Map<string, DomainResultLevel>();
    for (const row of riskSummaries) {
      const current = maxLevelBySession.get(row.sessionId) ?? DomainResultLevel.NOT_ASSESSED;
      if (SEVERITY_RANK[row.level] > SEVERITY_RANK[current]) {
        maxLevelBySession.set(row.sessionId, row.level);
      }
    }

    return sessions.map((s) => ({
      type: 'mha_session' as const,
      date: s.completedAt as Date,
      caseNumber: s.caseNumber,
      maxLevel: maxLevelBySession.get(s.id) ?? DomainResultLevel.NOT_ASSESSED,
      sessionId: s.id,
    }));
  }
}
