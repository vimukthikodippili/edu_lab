import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionActionEntity, SessionActionStatus } from './entities/session-action.entity';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { SEVERITY_RANK } from '../risk-summary/risk-aggregation.service';
import { ActionRuleService } from '../action-rule/action-rule.service';
import { AuditService } from '../audit/audit.service';

/** MHA-131 — FR-MHA-23/24/37. Rule-driven: loads active ActionRules (priority-ordered) and emits
 * one SessionAction per rule whose (riskCategory, minimumLevel) is met by the session's persisted
 * RiskSummary rows. `riskCategory: null` on a rule means "any category" (used by the Monthly
 * Follow-up catch-all, since that one default rule doesn't target a single category). Safety
 * escalation stays hardcoded, not a rule row — it's driven by DomainResult.safetyFlagRaised (a
 * boolean signal), not a risk-category severity threshold, so it doesn't fit the rule tuple.
 * No forced default action when nothing crosses a threshold — an empty list is a valid result. */
@Injectable()
export class RecommendedActionService {
  constructor(
    @InjectRepository(SessionActionEntity)
    private readonly actionRepo: Repository<SessionActionEntity>,
    private readonly actionRuleService: ActionRuleService,
    private readonly auditService: AuditService,
  ) {}

  async generate(
    sessionId: string,
    riskSummaries: RiskSummaryEntity[],
    hasSafetyFlag: boolean,
  ): Promise<SessionActionEntity[]> {
    const texts: string[] = [];

    // FR-MHA-23/AC #55 — safety flag, prepended first, always.
    if (hasSafetyFlag) {
      texts.push('Immediate Safety Escalation — notify counselor/clinician today');
    }

    const activeRules = await this.actionRuleService.findActive();
    for (const rule of activeRules) {
      const matches = riskSummaries.some(
        (s) =>
          (rule.riskCategory === null || s.riskCategory === rule.riskCategory) &&
          SEVERITY_RANK[s.level] >= SEVERITY_RANK[rule.minimumLevel],
      );
      if (matches) texts.push(rule.actionText);
    }

    const rows = texts.map((actionText, sortOrder) =>
      this.actionRepo.create({ sessionId, actionText, sortOrder, status: SessionActionStatus.OPEN }),
    );
    return this.actionRepo.save(rows);
  }

  async getPersistedActions(sessionId: string): Promise<SessionActionEntity[]> {
    return this.actionRepo.find({ where: { sessionId }, order: { sortOrder: 'ASC' } });
  }

  /** MHA-131 — FR-MHA-32. Counselor-facing open/complete tracking, independent of session status.
   * MHA-142 — AC #84-87. A completed action is immutable: any further PATCH (re-open OR
   * re-complete/re-note) is rejected with 422, since a completed action's record is meant to be a
   * permanent part of the audit trail, not just its `status` value. `completedAt`/
   * `completedByStaffId`/`completionNote` are only ever set together, on the one-time open->complete
   * transition. */
  async updateStatus(
    sessionId: string,
    actionId: string,
    status: SessionActionStatus,
    actorId: string,
    completionNote?: string,
  ): Promise<SessionActionEntity> {
    const action = await this.actionRepo.findOne({ where: { id: actionId, sessionId } });
    if (!action) {
      throw new NotFoundException(`Action ${actionId} not found for session ${sessionId}.`);
    }
    if (action.status === SessionActionStatus.COMPLETE) {
      throw new UnprocessableEntityException(
        'This action has already been completed and cannot be modified.',
      );
    }

    if (status === SessionActionStatus.COMPLETE) {
      action.status = SessionActionStatus.COMPLETE;
      action.completedAt = new Date();
      action.completedByStaffId = actorId;
      action.completionNote = completionNote ?? null;
      const saved = await this.actionRepo.save(action);
      await this.auditService.log({
        actorId,
        action: 'complete_action',
        targetType: 'session_action',
        targetId: saved.id,
        reason: completionNote ?? null,
      });
      return saved;
    }

    // status === OPEN and the action is already OPEN — a harmless no-op, unchanged from before
    // this story (the COMPLETE case above is the only real state transition now).
    action.status = status;
    const saved = await this.actionRepo.save(action);
    await this.auditService.log({
      actorId,
      action: 'update_action',
      targetType: 'session_action',
      targetId: saved.id,
    });
    return saved;
  }
}
