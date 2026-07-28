import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { RecommendedActionService } from './recommended-action.service';
import { SessionActionEntity, SessionActionStatus } from './entities/session-action.entity';
import { ActionRuleService } from '../action-rule/action-rule.service';
import { ActionRuleEntity } from '../action-rule/entities/action-rule.entity';
import { AuditService } from '../audit/audit.service';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../domain-result/entities/domain-result.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  find: jest.fn(),
  findOne: jest.fn(),
});

const SESSION_ID = 'session-uuid';

function summary(overrides: Partial<RiskSummaryEntity> = {}): RiskSummaryEntity {
  return {
    id: 'rs-1',
    sessionId: SESSION_ID,
    riskCategory: RiskCategory.BEHAVIORAL_RISK,
    level: DomainResultLevel.NOT_ASSESSED,
    createdAt: new Date(),
    ...overrides,
  } as RiskSummaryEntity;
}

function rule(overrides: Partial<ActionRuleEntity> = {}): ActionRuleEntity {
  return {
    id: 'rule-1',
    riskCategory: RiskCategory.ACADEMIC_RISK,
    minimumLevel: DomainResultLevel.MODERATE,
    actionText: 'School Counselor Review',
    isActive: true,
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// The 6 real default rules (AC #54), used for end-to-end-shaped tests.
const DEFAULT_RULES: ActionRuleEntity[] = [
  rule({ id: 'r1', riskCategory: RiskCategory.ACADEMIC_RISK, minimumLevel: DomainResultLevel.MODERATE, actionText: 'School Counselor Review', priority: 1 }),
  rule({ id: 'r2', riskCategory: RiskCategory.LEARNING_DISABILITY_RISK, minimumLevel: DomainResultLevel.MODERATE, actionText: 'Educational Psychologist Evaluation', priority: 2 }),
  rule({ id: 'r3', riskCategory: RiskCategory.EMOTIONAL_RISK, minimumLevel: DomainResultLevel.HIGH, actionText: 'Mental Health Counselor Referral', priority: 3 }),
  rule({ id: 'r4', riskCategory: RiskCategory.SOCIAL_RISK, minimumLevel: DomainResultLevel.HIGH, actionText: 'Bullying Intervention Protocol', priority: 4 }),
  rule({ id: 'r5', riskCategory: RiskCategory.ADDICTION_RISK, minimumLevel: DomainResultLevel.HIGH, actionText: 'Digital Wellbeing Program', priority: 5 }),
  rule({ id: 'r6', riskCategory: null, minimumLevel: DomainResultLevel.MODERATE, actionText: 'Monthly Follow-up', priority: 6 }),
];

describe('RecommendedActionService', () => {
  let service: RecommendedActionService;
  let actionRepo: MockRepo<SessionActionEntity>;
  let actionRuleService: { findActive: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    actionRepo = repoMock<SessionActionEntity>();
    actionRuleService = { findActive: jest.fn().mockResolvedValue([]) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendedActionService,
        { provide: getRepositoryToken(SessionActionEntity), useValue: actionRepo },
        { provide: ActionRuleService, useValue: actionRuleService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<RecommendedActionService>(RecommendedActionService);
  });

  describe('generate', () => {
    it('AI-prompt test (a): safety action is always first (sortOrder 0), regardless of how many rules also match', async () => {
      actionRuleService.findActive.mockResolvedValue(DEFAULT_RULES);
      const rows = await service.generate(
        SESSION_ID,
        [
          summary({ riskCategory: RiskCategory.ACADEMIC_RISK, level: DomainResultLevel.SEVERE }),
          summary({ riskCategory: RiskCategory.EMOTIONAL_RISK, level: DomainResultLevel.SEVERE }),
        ],
        true,
      );
      expect(rows[0].actionText).toBe('Immediate Safety Escalation — notify counselor/clinician today');
      expect(rows[0].sortOrder).toBe(0);
    });

    it('AI-prompt test (b): no actions generated when every category is below every active rule\'s threshold', async () => {
      actionRuleService.findActive.mockResolvedValue(DEFAULT_RULES);
      const rows = await service.generate(
        SESSION_ID,
        [
          summary({ riskCategory: RiskCategory.ACADEMIC_RISK, level: DomainResultLevel.LOW }),
          summary({ riskCategory: RiskCategory.EMOTIONAL_RISK, level: DomainResultLevel.LOW }),
        ],
        false,
      );
      expect(rows).toEqual([]);
    });

    it('AI-prompt test (c): a newly-added rule (returned by findActive) is applied on the next generate() call', async () => {
      const newRule = rule({
        id: 'r-new',
        riskCategory: RiskCategory.HEALTH_LIFESTYLE_RISK,
        minimumLevel: DomainResultLevel.LOW,
        actionText: 'Sleep Hygiene Consultation',
        priority: 7,
      });
      actionRuleService.findActive.mockResolvedValue([...DEFAULT_RULES, newRule]);
      const rows = await service.generate(
        SESSION_ID,
        [summary({ riskCategory: RiskCategory.HEALTH_LIFESTYLE_RISK, level: DomainResultLevel.LOW })],
        false,
      );
      expect(rows.map((r) => r.actionText)).toContain('Sleep Hygiene Consultation');
    });

    it('matches a rule only against its own risk category — Addiction High does not trigger the Emotional-Risk rule', async () => {
      actionRuleService.findActive.mockResolvedValue(DEFAULT_RULES);
      const rows = await service.generate(
        SESSION_ID,
        [summary({ riskCategory: RiskCategory.ADDICTION_RISK, level: DomainResultLevel.HIGH })],
        false,
      );
      const texts = rows.map((r) => r.actionText);
      expect(texts).toContain('Digital Wellbeing Program');
      expect(texts).not.toContain('Mental Health Counselor Referral');
    });

    it('a riskCategory:null rule matches ANY category at or above its minimumLevel (the wildcard)', async () => {
      actionRuleService.findActive.mockResolvedValue([DEFAULT_RULES[5]]); // Monthly Follow-up only
      const rows = await service.generate(
        SESSION_ID,
        [summary({ riskCategory: RiskCategory.HEALTH_LIFESTYLE_RISK, level: DomainResultLevel.MODERATE })],
        false,
      );
      expect(rows.map((r) => r.actionText)).toEqual(['Monthly Follow-up']);
    });

    it('never loads inactive rules (relies on findActive() already filtering isActive:true)', async () => {
      actionRuleService.findActive.mockResolvedValue([]); // simulates the one active-only query result
      const rows = await service.generate(
        SESSION_ID,
        [summary({ riskCategory: RiskCategory.ACADEMIC_RISK, level: DomainResultLevel.SEVERE })],
        false,
      );
      expect(rows).toEqual([]);
      expect(actionRuleService.findActive).toHaveBeenCalledTimes(1);
    });

    it('every generated row defaults to status: open', async () => {
      actionRuleService.findActive.mockResolvedValue(DEFAULT_RULES);
      const rows = await service.generate(
        SESSION_ID,
        [summary({ riskCategory: RiskCategory.ACADEMIC_RISK, level: DomainResultLevel.SEVERE })],
        true,
      );
      expect(rows.every((r) => r.status === SessionActionStatus.OPEN)).toBe(true);
    });
  });

  describe('getPersistedActions', () => {
    it('returns rows ordered by sortOrder ascending', async () => {
      const persisted = [{ id: 'a1' }] as unknown as SessionActionEntity[];
      actionRepo.find!.mockResolvedValue(persisted);
      const result = await service.getPersistedActions(SESSION_ID);
      expect(actionRepo.find).toHaveBeenCalledWith({ where: { sessionId: SESSION_ID }, order: { sortOrder: 'ASC' } });
      expect(result).toBe(persisted);
    });
  });

  describe('updateStatus (MHA-142 — completion tracking)', () => {
    it('throws NotFoundException when the action does not belong to the given session', async () => {
      actionRepo.findOne!.mockResolvedValue(undefined);
      await expect(
        service.updateStatus(SESSION_ID, 'wrong-action', SessionActionStatus.COMPLETE, 'staff-1'),
      ).rejects.toThrow(NotFoundException);
      expect(actionRepo.save).not.toHaveBeenCalled();
    });

    it('open -> complete sets completedAt/completedByStaffId/completionNote and logs a complete_action audit entry', async () => {
      actionRepo.findOne!.mockResolvedValue({ id: 'a1', sessionId: SESSION_ID, status: SessionActionStatus.OPEN });
      const before = Date.now();

      const result = await service.updateStatus(
        SESSION_ID,
        'a1',
        SessionActionStatus.COMPLETE,
        'staff-1',
        'Parent meeting held on 27/07.',
      );

      expect(result.status).toBe(SessionActionStatus.COMPLETE);
      expect(result.completedByStaffId).toBe('staff-1');
      expect(result.completionNote).toBe('Parent meeting held on 27/07.');
      expect(result.completedAt).toBeInstanceOf(Date);
      expect((result.completedAt as Date).getTime()).toBeGreaterThanOrEqual(before);

      // AI-prompt test (c) — the completion audit record includes who (actorId), when
      // (completedAt is set on the row itself; the audit row's own createdAt is DB-automatic),
      // and the note (reason).
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: 'staff-1',
        action: 'complete_action',
        targetType: 'session_action',
        targetId: 'a1',
        reason: 'Parent meeting held on 27/07.',
      });
    });

    it('open -> complete without a note leaves completionNote/reason both null', async () => {
      actionRepo.findOne!.mockResolvedValue({ id: 'a1', sessionId: SESSION_ID, status: SessionActionStatus.OPEN });

      const result = await service.updateStatus(SESSION_ID, 'a1', SessionActionStatus.COMPLETE, 'staff-1');

      expect(result.completionNote).toBeNull();
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
    });

    it('open -> open (already open) is a harmless no-op that does not set completion fields', async () => {
      actionRepo.findOne!.mockResolvedValue({ id: 'a1', sessionId: SESSION_ID, status: SessionActionStatus.OPEN });

      const result = await service.updateStatus(SESSION_ID, 'a1', SessionActionStatus.OPEN, 'staff-1');

      expect(result.status).toBe(SessionActionStatus.OPEN);
      expect(result.completedAt).toBeUndefined();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update_action' }),
      );
    });

    // AI-prompt test (b) — a completed action cannot be re-opened (422). Read literally, plus a
    // stronger disclosed reading (re-completing/re-noting an already-complete action is also
    // rejected — AC #87 frames the completion record itself, not just `status`, as permanent).
    it('rejects an attempt to re-open an already-complete action with 422', async () => {
      actionRepo.findOne!.mockResolvedValue({
        id: 'a1',
        sessionId: SESSION_ID,
        status: SessionActionStatus.COMPLETE,
        completedAt: new Date('2026-07-01T00:00:00.000Z'),
        completedByStaffId: 'staff-1',
        completionNote: 'Already done.',
      });

      await expect(
        service.updateStatus(SESSION_ID, 'a1', SessionActionStatus.OPEN, 'staff-2'),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(actionRepo.save).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('rejects an attempt to re-complete (or re-note) an already-complete action with 422', async () => {
      actionRepo.findOne!.mockResolvedValue({
        id: 'a1',
        sessionId: SESSION_ID,
        status: SessionActionStatus.COMPLETE,
        completedAt: new Date('2026-07-01T00:00:00.000Z'),
        completedByStaffId: 'staff-1',
        completionNote: 'Already done.',
      });

      await expect(
        service.updateStatus(SESSION_ID, 'a1', SessionActionStatus.COMPLETE, 'staff-2', 'A different note.'),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(actionRepo.save).not.toHaveBeenCalled();
    });
  });
});
