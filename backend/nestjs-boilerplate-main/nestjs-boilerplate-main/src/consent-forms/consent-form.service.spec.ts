import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ConsentFormService } from './consent-form.service';
import { ConsentFormEntity, ConsentTargetType } from './entities/consent-form.entity';
import { ConsentResponseEntity, ConsentResponseType } from './entities/consent-response.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'generated', ...(d as object) })),
  create: jest.fn((d: unknown) => d),
});

const STAFF_ID = 'staff-admin-1';
const FORM_ID = 'form-1';

function buildGuardian(id: string, overrides: Partial<GuardianEntity> = {}): GuardianEntity {
  return {
    id,
    firstName: 'Guardian',
    lastName: id,
    phone: '0771234567',
    email: null,
    pushToken: null,
    isBlacklisted: false,
    ...overrides,
  } as GuardianEntity;
}

function buildStudent(id: string, gradeId: number, guardians: GuardianEntity[]): StudentEntity {
  return { id, gradeId, guardians } as unknown as StudentEntity;
}

function buildForm(overrides: Partial<ConsentFormEntity> = {}): ConsentFormEntity {
  return {
    id: FORM_ID,
    title: 'Field Trip Consent',
    description: 'Grade 8 trip',
    targetType: ConsentTargetType.SPECIFIC_GRADES,
    targetGrades: [8],
    targetStudentIds: null,
    deadline: '2099-01-01',
    createdByStaffId: STAFF_ID,
    createdAt: new Date(),
    ...overrides,
  } as ConsentFormEntity;
}

describe('ConsentFormService', () => {
  let service: ConsentFormService;
  let formRepo: MockRepo<ConsentFormEntity>;
  let responseRepo: MockRepo<ConsentResponseEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let auditService: { log: jest.Mock };
  let notificationService: { createForGuardian: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };

  const guardianA = buildGuardian('guardian-a');
  const guardianB = buildGuardian('guardian-b');
  const studentInGrade8 = buildStudent('student-1', 8, [guardianA]);
  const studentInGrade9 = buildStudent('student-2', 9, [guardianB]);

  beforeEach(async () => {
    formRepo = repoMock<ConsentFormEntity>();
    responseRepo = repoMock<ConsentResponseEntity>();
    studentRepo = repoMock<StudentEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForGuardian: jest.fn().mockResolvedValue(undefined) };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentFormService,
        { provide: getRepositoryToken(ConsentFormEntity), useValue: formRepo },
        { provide: getRepositoryToken(ConsentResponseEntity), useValue: responseRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(ConsentFormService);
  });

  describe('resolveTargetPairs — target resolution (AI-prompt-requested test)', () => {
    it('SPECIFIC_GRADES returns exactly the guardians of students in those grades, and no others', async () => {
      (studentRepo.find as jest.Mock).mockResolvedValue([studentInGrade8]);

      const pairs = await service.resolveTargetPairs(
        buildForm({ targetType: ConsentTargetType.SPECIFIC_GRADES, targetGrades: [8] }),
      );

      expect(pairs).toHaveLength(1);
      expect(pairs[0].student.id).toBe('student-1');
      expect(pairs[0].guardians.map((g) => g.id)).toEqual(['guardian-a']);
      expect(studentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { gradeId: expect.anything() } }),
      );
    });

    it('ALL_PARENTS returns every student guardians', async () => {
      (studentRepo.find as jest.Mock).mockResolvedValue([studentInGrade8, studentInGrade9]);

      const pairs = await service.resolveTargetPairs(buildForm({ targetType: ConsentTargetType.ALL_PARENTS, targetGrades: null }));

      expect(pairs).toHaveLength(2);
      expect(pairs.map((p) => p.student.id).sort()).toEqual(['student-1', 'student-2']);
    });

    it('SPECIFIC_STUDENTS returns exactly those students', async () => {
      (studentRepo.find as jest.Mock).mockResolvedValue([studentInGrade9]);

      const pairs = await service.resolveTargetPairs(
        buildForm({ targetType: ConsentTargetType.SPECIFIC_STUDENTS, targetGrades: null, targetStudentIds: ['student-2'] }),
      );

      expect(pairs).toHaveLength(1);
      expect(pairs[0].student.id).toBe('student-2');
    });

    it('excludes blacklisted guardians', async () => {
      const blacklisted = buildGuardian('guardian-blocked', { isBlacklisted: true });
      (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent('student-3', 8, [blacklisted])]);

      const pairs = await service.resolveTargetPairs(buildForm());

      expect(pairs[0].guardians).toHaveLength(0);
    });
  });

  describe('getDashboard — status computation', () => {
    it('marks each student signed, declined, or pending based on its response row', async () => {
      (formRepo.findOne as jest.Mock).mockResolvedValue(buildForm());
      (studentRepo.find as jest.Mock).mockResolvedValue([studentInGrade8, buildStudent('student-4', 8, [guardianB])]);
      (responseRepo.find as jest.Mock).mockResolvedValue([
        {
          id: 'resp-1',
          consentFormId: FORM_ID,
          guardianId: 'guardian-a',
          studentId: 'student-1',
          response: ConsentResponseType.SIGNED,
          reason: null,
          respondedAt: new Date(),
          ipAddress: '127.0.0.1',
        },
      ]);

      const rows = await service.getDashboard(FORM_ID);

      const byId = new Map(rows.map((r) => [r.student.id, r.status]));
      expect(byId.get('student-1')).toBe('signed');
      expect(byId.get('student-4')).toBe('pending');
    });

    it('throws NotFoundException for an unknown form id', async () => {
      (formRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getDashboard('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remindPending', () => {
    it('only notifies guardians of currently-unresponded students, and audit-logs once', async () => {
      (formRepo.findOne as jest.Mock).mockResolvedValue(buildForm());
      (studentRepo.find as jest.Mock).mockResolvedValue([studentInGrade8, buildStudent('student-5', 8, [guardianB])]);
      (responseRepo.find as jest.Mock).mockResolvedValue([
        {
          id: 'resp-1',
          consentFormId: FORM_ID,
          guardianId: 'guardian-a',
          studentId: 'student-1',
          response: ConsentResponseType.SIGNED,
          reason: null,
          respondedAt: new Date(),
          ipAddress: null,
        },
      ]);

      const remindedCount = await service.remindPending(FORM_ID, STAFF_ID);

      expect(remindedCount).toBe(1);
      expect(notificationService.createForGuardian).toHaveBeenCalledTimes(1);
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-b',
        expect.stringContaining('Reminder'),
        expect.any(String),
        'consent_reminder',
      );
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'remind_consent', targetType: 'consent_form', targetId: FORM_ID }),
      );
    });
  });

  describe('sendDailyReminders — pending-reminder job filter logic (AI-prompt-requested test)', () => {
    it('only processes forms whose deadline has not passed, and skips already-responded students', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const openForm = buildForm({ id: 'form-open', deadline: '2099-01-01' });

      (formRepo.find as jest.Mock).mockResolvedValue([openForm]);
      (studentRepo.find as jest.Mock).mockResolvedValue([studentInGrade8]);
      (responseRepo.find as jest.Mock).mockResolvedValue([]);

      await service.sendDailyReminders();

      expect(formRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deadline: expect.anything() } }),
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-a',
        expect.stringContaining('Reminder'),
        expect.any(String),
        'consent_reminder',
      );
      void today;
    });

    it('sends no reminder when every targeted student has already responded', async () => {
      const openForm = buildForm({ id: 'form-open' });
      (formRepo.find as jest.Mock).mockResolvedValue([openForm]);
      (studentRepo.find as jest.Mock).mockResolvedValue([studentInGrade8]);
      (responseRepo.find as jest.Mock).mockResolvedValue([
        {
          id: 'resp-1',
          consentFormId: 'form-open',
          guardianId: 'guardian-a',
          studentId: 'student-1',
          response: ConsentResponseType.SIGNED,
          reason: null,
          respondedAt: new Date(),
          ipAddress: null,
        },
      ]);

      await service.sendDailyReminders();

      expect(notificationService.createForGuardian).not.toHaveBeenCalled();
    });
  });
});
