import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { SafetyFlagEscalationService } from './safety-flag-escalation.service';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { StaffService } from '../staff/staff.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { CounselorCaseService } from '../counselor/counselor-case.service';
import { SafetyNotificationQueueService } from '../safety-notification/safety-notification-queue.service';
import { DeliveryChannel } from '../safety-notification/entities/notification-delivery-log.entity';
import { CRISIS_RESOURCES } from './config/crisis-resources.config';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn(),
});

const COUNSELOR_STAFF_ID = 'counselor-staff-uuid';
const STUDENT_ID = 'student-uuid';
const SESSION_ID = 'session-uuid';
const CASE_NUMBER = 'SC-20260723-001';

interface FakeStaff {
  id: string;
  email: string;
  phone: string;
  pushToken: string | null;
}

function buildStaff(overrides: Partial<FakeStaff> = {}): FakeStaff {
  return {
    id: 'staff-uuid',
    email: 'test@sims.edu.lk',
    phone: '0770000000',
    pushToken: null,
    ...overrides,
  };
}

describe('SafetyFlagEscalationService', () => {
  let service: SafetyFlagEscalationService;
  let userRepo: MockRepo<UserEntity>;
  let staffService: { findById: jest.Mock; findByEmail: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };
  let counselorCaseService: { upsertSafetyFlagCase: jest.Mock };
  let queueService: { createLogAndDispatch: jest.Mock };

  beforeEach(async () => {
    userRepo = repoMock<UserEntity>();
    staffService = { findById: jest.fn(), findByEmail: jest.fn() };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };
    counselorCaseService = { upsertSafetyFlagCase: jest.fn().mockResolvedValue(undefined) };
    queueService = {
      createLogAndDispatch: jest.fn((ctx: unknown, send: () => Promise<void>) =>
        send().then(
          () => ({ ...(ctx as object), status: 'sent', attempts: 1 }),
          () => ({ ...(ctx as object), status: 'retrying', attempts: 1 }),
        ),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyFlagEscalationService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: StaffService, useValue: staffService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
        { provide: CounselorCaseService, useValue: counselorCaseService },
        { provide: SafetyNotificationQueueService, useValue: queueService },
      ],
    }).compile();

    service = module.get<SafetyFlagEscalationService>(SafetyFlagEscalationService);
  });

  describe('recipient resolution and dispatch', () => {
    it('enqueues an SMS delivery for the session counselor and all principal-role staff (AI-prompt test c)', async () => {
      const counselor = buildStaff({ id: 'counselor-staff-uuid', phone: '0770000001' });
      const principal1 = buildStaff({ id: 'principal-1', email: 'p1@sims.edu.lk', phone: '0770000002' });
      const principal2 = buildStaff({ id: 'principal-2', email: 'p2@sims.edu.lk', phone: '0770000003' });

      staffService.findById.mockResolvedValue(counselor);
      userRepo.find!.mockResolvedValue([
        { email: 'p1@sims.edu.lk', role: { id: 3 } },
        { email: 'p2@sims.edu.lk', role: { id: 3 } },
      ]);
      staffService.findByEmail.mockImplementation((email: string) => {
        if (email === 'p1@sims.edu.lk') return Promise.resolve(principal1);
        if (email === 'p2@sims.edu.lk') return Promise.resolve(principal2);
        return Promise.resolve(null);
      });

      await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      const smsCalls = queueService.createLogAndDispatch.mock.calls.filter(
        ([ctx]) => ctx.channel === DeliveryChannel.SMS,
      );
      expect(smsCalls).toHaveLength(3);
      expect(smsCalls.map(([ctx]) => ctx.recipientStaffId).sort()).toEqual(
        ['counselor-staff-uuid', 'principal-1', 'principal-2'].sort(),
      );
      smsCalls.forEach(([ctx]) => {
        expect(ctx.sessionId).toBe(SESSION_ID);
        expect(ctx.studentId).toBe(STUDENT_ID);
        expect(ctx.alertId).toEqual(expect.any(String));
      });
    });

    it('uses the same alertId across every delivery from one escalate() call', async () => {
      staffService.findById.mockResolvedValue(buildStaff({ pushToken: 'push-token' }));
      userRepo.find!.mockResolvedValue([]);

      await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      const alertIds = queueService.createLogAndDispatch.mock.calls.map(([ctx]) => ctx.alertId);
      expect(new Set(alertIds).size).toBe(1);
    });

    it('dedupes when the session counselor is also a principal — enqueued once, not twice', async () => {
      const dual = buildStaff({ id: 'dual-role-staff', email: 'dual@sims.edu.lk', phone: '0770000009' });
      staffService.findById.mockResolvedValue(dual);
      userRepo.find!.mockResolvedValue([{ email: 'dual@sims.edu.lk', role: { id: 3 } }]);
      staffService.findByEmail.mockResolvedValue(dual);

      await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      const smsCalls = queueService.createLogAndDispatch.mock.calls.filter(
        ([ctx]) => ctx.channel === DeliveryChannel.SMS,
      );
      expect(smsCalls).toHaveLength(1);
    });

    it('enqueues a push delivery only for recipients with a non-null pushToken', async () => {
      staffService.findById.mockResolvedValue(buildStaff({ pushToken: 'push-token-abc' }));
      userRepo.find!.mockResolvedValue([]);

      await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      const pushCalls = queueService.createLogAndDispatch.mock.calls.filter(
        ([ctx]) => ctx.channel === DeliveryChannel.PUSH,
      );
      expect(pushCalls).toHaveLength(1);
    });

    it('does not enqueue a push delivery for a recipient with a null pushToken', async () => {
      staffService.findById.mockResolvedValue(buildStaff({ pushToken: null }));
      userRepo.find!.mockResolvedValue([]);

      await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      const pushCalls = queueService.createLogAndDispatch.mock.calls.filter(
        ([ctx]) => ctx.channel === DeliveryChannel.PUSH,
      );
      expect(pushCalls).toHaveLength(0);
    });

    it('one failed delivery does not prevent others or the case upsert', async () => {
      const counselor = buildStaff({ id: 'c1', phone: '111' });
      const principal = buildStaff({ id: 'p1', email: 'p1@sims.edu.lk', phone: '222' });
      staffService.findById.mockResolvedValue(counselor);
      userRepo.find!.mockResolvedValue([{ email: 'p1@sims.edu.lk', role: { id: 3 } }]);
      staffService.findByEmail.mockResolvedValue(principal);
      smsService.sendSms
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(undefined);

      await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      expect(queueService.createLogAndDispatch).toHaveBeenCalledTimes(2);
      expect(counselorCaseService.upsertSafetyFlagCase).toHaveBeenCalled();
    });
  });

  describe('CounselorCase upsert', () => {
    it('calls upsertSafetyFlagCase with the exact template string', async () => {
      staffService.findById.mockResolvedValue(buildStaff());
      userRepo.find!.mockResolvedValue([]);

      await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      expect(counselorCaseService.upsertSafetyFlagCase).toHaveBeenCalledWith(
        STUDENT_ID,
        `Safety flag raised in MHA session ${CASE_NUMBER}`,
      );
    });
  });

  describe('crisis resources', () => {
    it('returns CRISIS_RESOURCES verbatim', async () => {
      staffService.findById.mockResolvedValue(buildStaff());
      userRepo.find!.mockResolvedValue([]);

      const result = await service.escalate({
        counselorStaffId: COUNSELOR_STAFF_ID,
        studentId: STUDENT_ID,
        sessionId: SESSION_ID,
        caseNumber: CASE_NUMBER,
      });

      expect(result).toEqual(CRISIS_RESOURCES);
    });
  });
});
