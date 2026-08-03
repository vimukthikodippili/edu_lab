import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { VisitorService } from './visitor.service';
import { VisitorEntity, VisitorIdType, VisitorType } from './entities/visitor.entity';
import { VisitorLogEntity } from './entities/visitor-log.entity';
import { PreRegisteredVisitorEntity } from './entities/pre-registered-visitor.entity';
import { DailyVisitorSummaryEntity } from './entities/daily-visitor-summary.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StaffService } from '../staff/staff.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'generated', ...(d as object) })),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn(),
});

function buildQueryBuilder(result: unknown[]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}

const HOST_ID = 'host-staff-1';
const ACTOR_ID = 'security-staff-1';

function buildSignInDto(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    fullName: 'John Visitor',
    idNumber: '881234567V',
    idType: VisitorIdType.NIC,
    visitorType: VisitorType.CONTRACTOR,
    purpose: 'Fixing the AC',
    hostStaffId: HOST_ID,
    expectedDepartureTime: '2026-08-03T15:00:00.000Z',
    ...overrides,
  };
}

function buildVisitor(overrides: Partial<VisitorEntity> = {}): VisitorEntity {
  return {
    id: 'visitor-1',
    fullName: 'John Visitor',
    idNumber: '881234567V',
    idType: VisitorIdType.NIC,
    visitorType: VisitorType.CONTRACTOR,
    photoId: null,
    isBlocked: false,
    blockedReason: null,
    ...overrides,
  } as VisitorEntity;
}

function buildHost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: HOST_ID,
    firstName: 'Nimal',
    lastName: 'Perera',
    phone: '0771111111',
    pushToken: 'push-token-host',
    ...overrides,
  };
}

describe('VisitorService', () => {
  let service: VisitorService;
  let visitorRepo: MockRepo<VisitorEntity>;
  let logRepo: MockRepo<VisitorLogEntity>;
  let preRegRepo: MockRepo<PreRegisteredVisitorEntity>;
  let summaryRepo: MockRepo<DailyVisitorSummaryEntity>;
  let userRepo: MockRepo<UserEntity>;
  let staffService: { findById: jest.Mock; findByEmail: jest.Mock };
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };

  beforeEach(async () => {
    visitorRepo = repoMock<VisitorEntity>();
    logRepo = repoMock<VisitorLogEntity>();
    preRegRepo = repoMock<PreRegisteredVisitorEntity>();
    summaryRepo = repoMock<DailyVisitorSummaryEntity>();
    userRepo = repoMock<UserEntity>();
    staffService = { findById: jest.fn().mockResolvedValue(buildHost()), findByEmail: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForStaff: jest.fn().mockResolvedValue(undefined) };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };

    (visitorRepo.findOne as jest.Mock).mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitorService,
        { provide: getRepositoryToken(VisitorEntity), useValue: visitorRepo },
        { provide: getRepositoryToken(VisitorLogEntity), useValue: logRepo },
        { provide: getRepositoryToken(PreRegisteredVisitorEntity), useValue: preRegRepo },
        { provide: getRepositoryToken(DailyVisitorSummaryEntity), useValue: summaryRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: StaffService, useValue: staffService },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(VisitorService);
  });

  describe('signIn — blocked visitor (AI-prompt-requested test)', () => {
    it('alerts security/admin/principal, throws ForbiddenException, and creates no VisitorLog row', async () => {
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(buildVisitor({ isBlocked: true }));
      (userRepo.find as jest.Mock).mockResolvedValue([
        { id: 1, email: 'security@sims.edu.lk', role: { id: RoleEnum.security_officer } },
        { id: 2, email: 'principal@sims.edu.lk', role: { id: RoleEnum.principal } },
      ]);
      (staffService.findByEmail as jest.Mock).mockImplementation((email: string) =>
        Promise.resolve({ id: `staff-for-${email}` }),
      );

      await expect(service.signIn(buildSignInDto(), ACTOR_ID)).rejects.toThrow(ForbiddenException);

      expect(logRepo.save).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(2);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'staff-for-security@sims.edu.lk',
        expect.stringContaining('Blocked'),
        expect.any(String),
        'security_alert',
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'visitor_blocked', targetType: 'visitor', targetId: 'visitor-1' }),
      );
    });

    it('never even queries the host when the visitor is blocked', async () => {
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(buildVisitor({ isBlocked: true }));
      (userRepo.find as jest.Mock).mockResolvedValue([]);

      await expect(service.signIn(buildSignInDto(), ACTOR_ID)).rejects.toThrow(ForbiddenException);
      expect(staffService.findById).not.toHaveBeenCalled();
    });
  });

  describe('signIn — happy path', () => {
    it('creates a VisitorLog with a rendered badge QR and the correct expiry, and notifies the host on all 3 channels', async () => {
      const result = await service.signIn(buildSignInDto(), ACTOR_ID);

      expect(logRepo.save).toHaveBeenCalledTimes(1);
      const saved = (logRepo.save as jest.Mock).mock.calls[0][0];
      expect(saved.badgeQrCode).toEqual(expect.stringContaining('data:image/png;base64,'));
      expect(saved.qrCodeExpiresAt).toEqual(new Date('2026-08-03T15:00:00.000Z'));
      expect(saved.hostStaffId).toBe(HOST_ID);

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        HOST_ID,
        'Visitor Signed In',
        expect.any(String),
        'visitor_arrived',
      );
      expect(smsService.sendSms).toHaveBeenCalledWith('0771111111', expect.any(String));
      expect(pushService.sendPush).toHaveBeenCalledWith('push-token-host', 'Visitor Signed In', expect.any(String));
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'visitor_sign_in', targetType: 'visitor' }),
      );

      expect(result).toBeDefined();
    });

    it('reuses an existing Visitor row matched by (idType, idNumber) instead of creating a duplicate', async () => {
      const existingVisitor = buildVisitor();
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(existingVisitor);

      await service.signIn(buildSignInDto(), ACTOR_ID);

      expect(visitorRepo.create).not.toHaveBeenCalled();
      const saved = (logRepo.save as jest.Mock).mock.calls[0][0];
      expect(saved.visitorId).toBe(existingVisitor.id);
    });

    it('creates a new Visitor row when no match exists for this (idType, idNumber)', async () => {
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(null);

      await service.signIn(buildSignInDto(), ACTOR_ID);

      expect(visitorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ idNumber: '881234567V', idType: VisitorIdType.NIC }),
      );
      expect(visitorRepo.save).toHaveBeenCalled();
    });

    it('consumes a matching pre-registration when preRegistrationId is passed', async () => {
      await service.signIn(buildSignInDto({ preRegistrationId: 'pre-reg-1' }), ACTOR_ID);

      const createdLogId = (logRepo.create as jest.Mock).mock.calls[0][0].id;
      expect(preRegRepo.update).toHaveBeenCalledWith(
        { id: 'pre-reg-1' },
        { consumedVisitorLogId: createdLogId },
      );
    });
  });

  describe('signOut — immutability', () => {
    it('sets signedOutAt/signedOutById exactly once and computes duration', async () => {
      const signedInAt = new Date(Date.now() - 30 * 60 * 1000);
      (logRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'log-1',
        visitorId: 'visitor-1',
        signedInAt,
        signedOutAt: null,
      });

      const result = await service.signOut('log-1', ACTOR_ID);

      expect(result.durationMinutes).toBeGreaterThanOrEqual(29);
      expect(result.durationMinutes).toBeLessThanOrEqual(31);
      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ signedOutById: ACTOR_ID, signedOutAt: expect.any(Date) }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'visitor_sign_out', targetType: 'visitor' }),
      );
    });

    it('rejects a second sign-out attempt on an already-signed-out log', async () => {
      (logRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'log-1',
        signedOutAt: new Date('2026-08-03T11:00:00.000Z'),
      });

      await expect(service.signOut('log-1', ACTOR_ID)).rejects.toThrow(ForbiddenException);
      expect(logRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown log id', async () => {
      (logRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.signOut('missing', ACTOR_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkOverstays — the AI-prompt-requested overstay detection job', () => {
    it('alerts security/admin/principal for an overdue, still-signed-in visitor and marks it alerted (dedupe)', async () => {
      const overdueLog = {
        id: 'log-overdue',
        visitorId: 'visitor-1',
        expectedDepartureTime: new Date('2026-08-03T09:00:00.000Z'),
        signedOutAt: null,
        overstayAlertedAt: null,
      };
      (logRepo.find as jest.Mock).mockResolvedValue([overdueLog]);
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(buildVisitor());
      (userRepo.find as jest.Mock).mockResolvedValue([
        { id: 1, email: 'security@sims.edu.lk', role: { id: RoleEnum.security_officer } },
      ]);
      (staffService.findByEmail as jest.Mock).mockResolvedValue({ id: 'security-staff' });

      await service.checkOverstays();

      // Structural check: the query excludes already-alerted rows, so a real second tick
      // wouldn't re-fetch this row once overstayAlertedAt is set below.
      expect(logRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            signedOutAt: expect.anything(),
            expectedDepartureTime: expect.anything(),
            overstayAlertedAt: expect.anything(),
          }),
        }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'security-staff',
        expect.stringContaining('Overstay'),
        expect.any(String),
        'security_alert',
      );
      expect(logRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ overstayAlertedAt: expect.any(Date) }),
      );
    });

    it('does nothing when there are no overdue visitors', async () => {
      (logRepo.find as jest.Mock).mockResolvedValue([]);
      await service.checkOverstays();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
      expect(logRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyBadge — QR expiry (AI-prompt-requested test)', () => {
    it('is valid for an active, not-yet-expired badge', async () => {
      (logRepo.findOne as jest.Mock).mockResolvedValue({
        badgeQrCode: 'code-1',
        signedOutAt: null,
        qrCodeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const result = await service.verifyBadge('code-1');
      expect(result.valid).toBe(true);
    });

    it('is invalid once qrCodeExpiresAt has passed', async () => {
      (logRepo.findOne as jest.Mock).mockResolvedValue({
        badgeQrCode: 'code-1',
        signedOutAt: null,
        qrCodeExpiresAt: new Date(Date.now() - 60 * 60 * 1000),
      });
      const result = await service.verifyBadge('code-1');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('is invalid once the visitor has already signed out', async () => {
      (logRepo.findOne as jest.Mock).mockResolvedValue({
        badgeQrCode: 'code-1',
        signedOutAt: new Date(),
        qrCodeExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const result = await service.verifyBadge('code-1');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('signed out');
    });

    it('is invalid for an unknown code', async () => {
      (logRepo.findOne as jest.Mock).mockResolvedValue(null);
      const result = await service.verifyBadge('unknown');
      expect(result.valid).toBe(false);
    });
  });

  describe('setBlocked', () => {
    it('sets isBlocked and audit-logs the change', async () => {
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(buildVisitor({ isBlocked: false }));

      await service.setBlocked('visitor-1', { isBlocked: true, reason: 'Trespassing incident' }, ACTOR_ID);

      expect(visitorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isBlocked: true, blockedReason: 'Trespassing incident' }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'visitor_block', targetType: 'visitor', targetId: 'visitor-1' }),
      );
    });

    it('throws NotFoundException for an unknown visitor', async () => {
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.setBlocked('missing', { isBlocked: true }, ACTOR_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    it('short-circuits to an empty array when a name filter matches no visitors', async () => {
      (visitorRepo.find as jest.Mock).mockResolvedValue([]);
      const result = await service.search({ name: 'Nobody' });
      expect(result).toEqual([]);
      expect(logRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('builds a query filtered by the given criteria', async () => {
      const qb = buildQueryBuilder([{ id: 'log-1' }]);
      (logRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.search({ purpose: 'AC repair', hostStaffId: HOST_ID });

      expect(qb.andWhere).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'log-1' }]);
    });
  });

  describe('blockNewVisitor — blocking someone who has never visited', () => {
    it('creates a new, already-blocked Visitor when no match exists for this (idType, idNumber)', async () => {
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.blockNewVisitor(
        { fullName: 'John Doe', idNumber: '999888777V', idType: VisitorIdType.NIC, reason: 'Reported by another school' },
        ACTOR_ID,
      );

      expect(visitorRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'John Doe',
          idNumber: '999888777V',
          idType: VisitorIdType.NIC,
          isBlocked: true,
          blockedReason: 'Reported by another school',
        }),
      );
      expect(result.isBlocked).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'visitor_block', targetType: 'visitor' }),
      );
    });

    it('blocks the existing Visitor instead of creating a duplicate when a match already exists', async () => {
      const existing = buildVisitor({ id: 'visitor-existing', isBlocked: false });
      (visitorRepo.findOne as jest.Mock).mockResolvedValue(existing);

      await service.blockNewVisitor(
        { fullName: 'John Visitor', idNumber: '881234567V', idType: VisitorIdType.NIC, reason: 'Repeat offender' },
        ACTOR_ID,
      );

      expect(visitorRepo.create).not.toHaveBeenCalled();
      expect(visitorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'visitor-existing', isBlocked: true, blockedReason: 'Repeat offender' }),
      );
    });

    it('closes the loop end-to-end: a subsequent signIn attempt against the newly-blocked id is rejected', async () => {
      (visitorRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      const blocked = await service.blockNewVisitor(
        { fullName: 'John Doe', idNumber: '999888777V', idType: VisitorIdType.NIC },
        ACTOR_ID,
      );

      (visitorRepo.findOne as jest.Mock).mockResolvedValue({ ...blocked, isBlocked: true });
      (userRepo.find as jest.Mock).mockResolvedValue([]);

      await expect(
        service.signIn(buildSignInDto({ idNumber: '999888777V' }), ACTOR_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('compileDailySummary', () => {
    it('computes totals, byType breakdown, averageDurationMinutes (signed-out only), and overstayCount', async () => {
      const qb = buildQueryBuilder([
        { visitorId: 'v-a', signedInAt: new Date('2026-08-03T10:00:00Z'), signedOutAt: new Date('2026-08-03T10:30:00Z'), overstayAlertedAt: null },
        { visitorId: 'v-a', signedInAt: new Date('2026-08-03T11:00:00Z'), signedOutAt: null, overstayAlertedAt: new Date('2026-08-03T13:00:00Z') },
        { visitorId: 'v-b', signedInAt: new Date('2026-08-03T12:00:00Z'), signedOutAt: new Date('2026-08-03T12:20:00Z'), overstayAlertedAt: null },
      ]);
      (logRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (visitorRepo.find as jest.Mock).mockResolvedValue([
        buildVisitor({ id: 'v-a', visitorType: VisitorType.PARENT }),
        buildVisitor({ id: 'v-b', visitorType: VisitorType.CONTRACTOR }),
      ]);

      const summary = await service.compileDailySummary('2026-08-03');

      expect(summary.totalVisitors).toBe(3);
      expect(summary.stillOnSite).toBe(1);
      expect(summary.signedOut).toBe(2);
      expect(summary.byType).toEqual({ parent: 2, contractor: 1 });
      expect(summary.averageDurationMinutes).toBe(25); // (30 + 20) / 2
      expect(summary.overstayCount).toBe(1);
    });

    it('returns zeroed-out fields for a day with no visitors, without querying Visitor at all', async () => {
      const qb = buildQueryBuilder([]);
      (logRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const summary = await service.compileDailySummary('2026-08-03');

      expect(summary).toEqual(
        expect.objectContaining({ totalVisitors: 0, byType: {}, averageDurationMinutes: 0, overstayCount: 0 }),
      );
      expect(visitorRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('generateDailySummary — the AI-prompt-requested daily job', () => {
    it('persists a new summary row and notifies only Principal users, not security or admin', async () => {
      const qb = buildQueryBuilder([
        { visitorId: 'v-a', signedInAt: new Date(), signedOutAt: new Date(), overstayAlertedAt: null },
      ]);
      (logRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (visitorRepo.find as jest.Mock).mockResolvedValue([buildVisitor({ id: 'v-a', visitorType: VisitorType.PARENT })]);
      (summaryRepo.findOne as jest.Mock).mockResolvedValue(null);
      (userRepo.find as jest.Mock).mockResolvedValue([
        { id: 2, email: 'principal@sims.edu.lk', role: { id: RoleEnum.principal } },
      ]);
      (staffService.findByEmail as jest.Mock).mockResolvedValue({ id: 'principal-staff' });

      await service.generateDailySummary();

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: { id: RoleEnum.principal } } }),
      );
      expect(summaryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalVisitors: 1, byType: { parent: 1 } }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'principal-staff',
        'Daily Visitor Summary',
        expect.any(String),
        'daily_visitor_summary',
      );
    });

    it('upserts (updates, not duplicates) when a summary row already exists for today', async () => {
      const qb = buildQueryBuilder([]);
      (logRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (summaryRepo.findOne as jest.Mock).mockResolvedValue({ id: 'existing-summary', date: '2026-08-03' });
      (userRepo.find as jest.Mock).mockResolvedValue([]);

      await service.generateDailySummary();

      expect(summaryRepo.create).not.toHaveBeenCalled();
      expect(summaryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'existing-summary', totalVisitors: 0 }),
      );
    });
  });
});
