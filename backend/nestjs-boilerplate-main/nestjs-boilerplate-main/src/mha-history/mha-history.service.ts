import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { MhaSessionEntity, MhaSessionStatus } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { SEVERITY_RANK } from '../risk-summary/risk-aggregation.service';
import { SessionActionEntity } from '../session-action/entities/session-action.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';
import {
  MhaCategoryTrendDto,
  MhaHistoryResponseDto,
  MhaHistorySessionDto,
  TrendDirection,
} from './dto/mha-history-response.dto';

/** FR-MHA-27 — full chronological history + per-category trend for a student. Bulk-fetches
 * RiskSummary/SessionAction/Staff once each (In(sessionIds)/In(staffIds)) rather than looping the
 * existing single-session-scoped RiskAggregationService.getPersistedSummary()/
 * RecommendedActionService.getPersistedActions() per session, which would be 2xN queries for a
 * student with N completed sessions. */
@Injectable()
export class MhaHistoryService {
  constructor(
    @InjectRepository(MhaSessionEntity)
    private readonly sessionRepo: Repository<MhaSessionEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(RiskSummaryEntity)
    private readonly riskSummaryRepo: Repository<RiskSummaryEntity>,

    @InjectRepository(SessionActionEntity)
    private readonly sessionActionRepo: Repository<SessionActionEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  async getHistory(studentId: string): Promise<MhaHistoryResponseDto> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`);
    }
    const studentName = `${student.firstName} ${student.lastName}`;

    // AC #78 — oldest -> newest, a deliberate exception to this codebase's usual newest-first
    // list convention, for a trend-reading UI. `completedAt IS NOT NULL` excludes legacy
    // pre-MHA-124 rows that are `status='complete'` but have no completedAt and never went
    // through risk aggregation (empty riskCategories) — such a row can't satisfy AC #79's "7
    // category scores" contract, and without a real completedAt it has no defensible place in a
    // chronological order (caught live: it was landing last and being treated as the "most
    // recent" session for trend computation, producing a nonsensical trend against real data).
    const sessions = await this.sessionRepo.find({
      where: { studentId, status: MhaSessionStatus.COMPLETE, completedAt: Not(IsNull()) },
      order: { completedAt: 'ASC' },
    });

    if (sessions.length === 0) {
      return { studentId, studentName, sessions: [], trends: null };
    }

    const sessionIds = sessions.map((s) => s.id);
    const [riskSummaries, actions] = await Promise.all([
      this.riskSummaryRepo.find({ where: { sessionId: In(sessionIds) } }),
      this.sessionActionRepo.find({ where: { sessionId: In(sessionIds) }, order: { sortOrder: 'ASC' } }),
    ]);

    const counselorStaffIds = [...new Set(sessions.map((s) => s.counselorStaffId))];
    const staff = await this.staffRepo.find({ where: { id: In(counselorStaffIds) } });
    const counselorNameById = new Map(staff.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

    const riskSummariesBySession = new Map<string, RiskSummaryEntity[]>();
    for (const row of riskSummaries) {
      const bucket = riskSummariesBySession.get(row.sessionId) ?? [];
      bucket.push(row);
      riskSummariesBySession.set(row.sessionId, bucket);
    }
    const actionsBySession = new Map<string, SessionActionEntity[]>();
    for (const row of actions) {
      const bucket = actionsBySession.get(row.sessionId) ?? [];
      bucket.push(row);
      actionsBySession.set(row.sessionId, bucket);
    }

    const sessionDtos: MhaHistorySessionDto[] = sessions.map((s) => ({
      id: s.id,
      caseNumber: s.caseNumber,
      screeningDate: s.screeningDate,
      counselorName: counselorNameById.get(s.counselorStaffId) ?? 'Unknown Staff',
      riskCategories: (riskSummariesBySession.get(s.id) ?? []).map((r) => ({
        category: r.riskCategory,
        level: r.level,
      })),
      topFindings: s.topFindingsSnapshot,
      recommendedActions: (actionsBySession.get(s.id) ?? []).map((a) => ({
        id: a.id,
        actionText: a.actionText,
        status: a.status,
        completedAt: a.completedAt,
        completedByStaffId: a.completedByStaffId,
        completionNote: a.completionNote,
      })),
    }));

    // AC #80/AI-prompt test (b) — null (not an array of 'stable' entries) when < 2 sessions exist.
    const trends =
      sessionDtos.length >= 2
        ? this.computeTrends(sessionDtos[sessionDtos.length - 2], sessionDtos[sessionDtos.length - 1])
        : null;

    return { studentId, studentName, sessions: sessionDtos, trends };
  }

  private computeTrends(previous: MhaHistorySessionDto, latest: MhaHistorySessionDto): MhaCategoryTrendDto[] {
    return Object.values(RiskCategory).map((category) => {
      const prevLevel =
        previous.riskCategories.find((r) => r.category === category)?.level ?? DomainResultLevel.NOT_ASSESSED;
      const latestLevel =
        latest.riskCategories.find((r) => r.category === category)?.level ?? DomainResultLevel.NOT_ASSESSED;

      const prevRank = SEVERITY_RANK[prevLevel];
      const latestRank = SEVERITY_RANK[latestLevel];
      const trend: TrendDirection = latestRank > prevRank ? 'worse' : latestRank < prevRank ? 'better' : 'stable';

      return { category, trend };
    });
  }
}
