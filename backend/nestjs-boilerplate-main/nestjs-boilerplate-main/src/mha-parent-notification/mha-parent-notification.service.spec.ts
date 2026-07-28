import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import {
  MhaParentNotificationService,
  PARENT_NOTIFICATION_BANNED_TERMS,
  buildWellbeingCheckInTemplate,
} from './mha-parent-notification.service';
import { MhaSessionEntity, MhaSessionStatus } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ParentNotificationLogEntity, ParentNotificationStatus } from '../communication/entities/parent-notification-log.entity';
import { RecommendedActionService } from '../session-action/recommended-action.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';
import { RiskCategory } from '../disorder-registry/entities/disorder-registry.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  create: jest.fn((d: unknown) => d as T),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const SESSION_ID = 'session-uuid';
const STUDENT_ID = 'student-uuid';
const STAFF_ID = 'staff-uuid';

function buildGuardian(overrides: Partial<{ id: string; firstName: string; lastName: string; phone: string; pushToken: string | null }> = {}) {
  return {
    id: 'guardian-1',
    firstName: 'Nimal',
    lastName: 'Perera',
    phone: '0771234567',
    pushToken: null,
    ...overrides,
  };
}

describe('MhaParentNotificationService', () => {
  let service: MhaParentNotificationService;
  let sessionRepo: MockRepo<MhaSessionEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let logRepo: MockRepo<ParentNotificationLogEntity>;
  let recommendedActionService: { getPersistedActions: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };
  let notificationService: { createForGuardian: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    sessionRepo = repoMock<MhaSessionEntity>();
    studentRepo = repoMock<StudentEntity>();
    logRepo = repoMock<ParentNotificationLogEntity>();
    recommendedActionService = { getPersistedActions: jest.fn().mockResolvedValue([{ id: 'a1' }]) };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForGuardian: jest.fn().mockResolvedValue({}) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    sessionRepo.findOne!.mockResolvedValue({
      id: SESSION_ID,
      status: MhaSessionStatus.COMPLETE,
      studentId: STUDENT_ID,
    });
    studentRepo.findOne!.mockResolvedValue({
      id: STUDENT_ID,
      firstName: 'Kasun',
      lastName: 'Bandara',
      studentGuardians: [{ guardian: buildGuardian() }],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MhaParentNotificationService,
        { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ParentNotificationLogEntity), useValue: logRepo },
        { provide: RecommendedActionService, useValue: recommendedActionService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<MhaParentNotificationService>(MhaParentNotificationService);
  });

  describe('notifyGuardians — happy path', () => {
    it('dispatches SMS + in-app for a guardian with no pushToken, logs rows, audits, returns the count', async () => {
      const result = await service.notifyGuardians(SESSION_ID, undefined, STAFF_ID);

      expect(smsService.sendSms).toHaveBeenCalledWith('0771234567', expect.stringContaining('Kasun Bandara'));
      expect(pushService.sendPush).not.toHaveBeenCalled();
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-1',
        'Wellbeing Check-In Recommended',
        expect.stringContaining('Kasun Bandara'),
        'mha_wellbeing_checkin',
      );
      expect(logRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ source: 'mha_session', sessionId: SESSION_ID, studentId: STUDENT_ID, guardianId: 'guardian-1', channel: 'sms', status: ParentNotificationStatus.SENT }),
      ]);
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: STAFF_ID,
        action: 'notify_guardian',
        targetType: 'mha_session',
        targetId: SESSION_ID,
      });
      expect(result).toEqual({ guardiansNotified: 1 });
    });

    it('also dispatches push when the guardian has a pushToken', async () => {
      studentRepo.findOne!.mockResolvedValue({
        id: STUDENT_ID, firstName: 'Kasun', lastName: 'Bandara',
        studentGuardians: [{ guardian: buildGuardian({ pushToken: 'push-abc' }) }],
      });

      await service.notifyGuardians(SESSION_ID, undefined, STAFF_ID);

      expect(pushService.sendPush).toHaveBeenCalledWith('push-abc', 'Wellbeing Check-In Recommended', expect.any(String));
    });

    it('notifies every linked guardian, not just the first', async () => {
      studentRepo.findOne!.mockResolvedValue({
        id: STUDENT_ID, firstName: 'Kasun', lastName: 'Bandara',
        studentGuardians: [
          { guardian: buildGuardian({ id: 'g1', phone: '111' }) },
          { guardian: buildGuardian({ id: 'g2', phone: '222' }) },
        ],
      });

      const result = await service.notifyGuardians(SESSION_ID, undefined, STAFF_ID);

      expect(smsService.sendSms).toHaveBeenCalledTimes(2);
      expect(result.guardiansNotified).toBe(2);
    });

    it('appends a clean note to the fixed template', async () => {
      await service.notifyGuardians(SESSION_ID, 'Please call after 4pm.', STAFF_ID);
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '0771234567',
        expect.stringContaining('Please call after 4pm.'),
      );
    });

    it('one failed channel does not block the other channel or other guardians', async () => {
      studentRepo.findOne!.mockResolvedValue({
        id: STUDENT_ID, firstName: 'Kasun', lastName: 'Bandara',
        studentGuardians: [
          { guardian: buildGuardian({ id: 'g1', phone: '111', pushToken: 'push-1' }) },
          { guardian: buildGuardian({ id: 'g2', phone: '222' }) },
        ],
      });
      smsService.sendSms.mockRejectedValueOnce(new Error('carrier down')).mockResolvedValueOnce(undefined);

      const result = await service.notifyGuardians(SESSION_ID, undefined, STAFF_ID);

      expect(pushService.sendPush).toHaveBeenCalledTimes(1); // g1's push still attempted despite g1's SMS failing
      expect(smsService.sendSms).toHaveBeenCalledTimes(2); // g2's SMS still attempted
      expect(result.guardiansNotified).toBe(2);
      const savedRows = logRepo.save!.mock.calls[0][0];
      expect(savedRows.find((r: { status: string }) => r.status === ParentNotificationStatus.FAILED)).toBeDefined();
    });
  });

  describe('guard clauses', () => {
    it('throws NotFoundException for a missing session', async () => {
      sessionRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.notifyGuardians(SESSION_ID, undefined, STAFF_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the session is not complete', async () => {
      sessionRepo.findOne!.mockResolvedValue({ id: SESSION_ID, status: MhaSessionStatus.DRAFT, studentId: STUDENT_ID });
      await expect(service.notifyGuardians(SESSION_ID, undefined, STAFF_ID)).rejects.toThrow(ConflictException);
    });

    it('throws UnprocessableEntityException when there are zero recommended actions (AC #68)', async () => {
      recommendedActionService.getPersistedActions.mockResolvedValue([]);
      await expect(service.notifyGuardians(SESSION_ID, undefined, STAFF_ID)).rejects.toThrow(UnprocessableEntityException);
      expect(smsService.sendSms).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when the student has no linked guardians', async () => {
      studentRepo.findOne!.mockResolvedValue({ id: STUDENT_ID, firstName: 'Kasun', lastName: 'Bandara', studentGuardians: [] });
      await expect(service.notifyGuardians(SESSION_ID, undefined, STAFF_ID)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('AI-prompt test (a): content safety', () => {
    it('the fixed template itself never contains any banned term', () => {
      const rendered = buildWellbeingCheckInTemplate('Kasun Bandara').toLowerCase();
      for (const term of PARENT_NOTIFICATION_BANNED_TERMS) {
        expect(rendered).not.toContain(term);
      }
      // Explicit regression guard against the literal words the AI prompt names.
      for (const word of ['high', 'severe', 'depression', 'anxiety']) {
        expect(rendered).not.toContain(word);
      }
    });

    it.each([
      ['a risk-category-shaped string (proves "risk" blocks all 7 category names structurally)', `${RiskCategory.EMOTIONAL_RISK} noted`],
      ['high', 'The level was high today'],
      ['severe', 'This was quite severe'],
      ['ADHD', 'Concerned about ADHD'],
      ['depression', 'possible depression'],
      ['anxiety', 'signs of anxiety'],
      ['an addiction-domain-shaped string (proves "addiction" blocks all 4 addiction domains)', 'gaming addiction concern'],
    ])('rejects a note containing %s', async (_label, note) => {
      await expect(service.notifyGuardians(SESSION_ID, note, STAFF_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('accepts a clean, plain-language note', async () => {
      await expect(
        service.notifyGuardians(SESSION_ID, 'Happy to chat anytime this week.', STAFF_ID),
      ).resolves.toEqual({ guardiansNotified: 1 });
    });
  });
});
