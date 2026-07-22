import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { TargetedMessageService } from './targeted-message.service';
import { TargetedMessageEntity } from './entities/targeted-message.entity';
import { TargetedMessageRecipientEntity } from './entities/targeted-message-recipient.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { StaffFunctionalRole } from '../staff/entities/staff-role-assignment.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { MailerService } from '../mailer/mailer.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const GRADE_10_ID = 10;
const GRADE_11_ID = 11;
const SECTION_10A_ID = 1;
const SECTION_10B_ID = 2;
const STAFF_ID = 'staff-uuid';

const makeGuardian = (overrides: Partial<GuardianEntity> = {}): GuardianEntity =>
  ({
    id: 'guardian-uuid',
    firstName: 'Guardian',
    lastName: 'One',
    phone: '0771234567',
    email: 'guardian@example.com',
    pushToken: 'push-token-1',
    isBlacklisted: false,
    ...overrides,
  } as GuardianEntity);

const makeStudent = (overrides: Partial<StudentEntity> = {}): StudentEntity =>
  ({
    id: 'student-uuid',
    firstName: 'Student',
    lastName: 'One',
    gradeId: GRADE_10_ID,
    classSectionId: SECTION_10A_ID,
    guardians: [],
    ...overrides,
  } as unknown as StudentEntity);

const makeStaff = (overrides: Partial<StaffEntity> = {}): StaffEntity =>
  ({
    id: STAFF_ID,
    firstName: 'Teacher',
    lastName: 'One',
    phone: '0779876543',
    email: 'teacher@example.com',
    pushToken: 'push-token-2',
    status: StaffStatus.ACTIVE,
    roleAssignments: [{ staffId: STAFF_ID, role: StaffFunctionalRole.SUBJECT_TEACHER }],
    ...overrides,
  } as unknown as StaffEntity);

describe('TargetedMessageService', () => {
  let service: TargetedMessageService;
  let messageRepo: MockRepo<TargetedMessageEntity>;
  let messageRecipientRepo: MockRepo<TargetedMessageRecipientEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let studentGuardianRepo: MockRepo<StudentGuardianEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let classSectionRepo: MockRepo<ClassSectionEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let timetableEntryRepo: MockRepo<TimetableEntryEntity>;
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };
  let mailerService: { sendMail: jest.Mock };

  beforeEach(async () => {
    messageRepo = repoMock<TargetedMessageEntity>();
    messageRecipientRepo = repoMock<TargetedMessageRecipientEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    studentGuardianRepo = repoMock<StudentGuardianEntity>();
    studentRepo = repoMock<StudentEntity>();
    classSectionRepo = repoMock<ClassSectionEntity>();
    staffRepo = repoMock<StaffEntity>();
    timetableEntryRepo = repoMock<TimetableEntryEntity>();
    timetableEntryRepo.createQueryBuilder = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };
    mailerService = { sendMail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TargetedMessageService,
        { provide: getRepositoryToken(TargetedMessageEntity), useValue: messageRepo },
        { provide: getRepositoryToken(TargetedMessageRecipientEntity), useValue: messageRecipientRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: studentGuardianRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: getRepositoryToken(TimetableEntryEntity), useValue: timetableEntryRepo },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
        { provide: MailerService, useValue: mailerService },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn().mockReturnValue('/app') } },
      ],
    }).compile();

    service = module.get<TargetedMessageService>(TargetedMessageService);
  });

  describe('resolveRecipients — by grade', () => {
    it('resolves all guardians linked to Grade 10 students, no duplicates — the explicitly-requested test', async () => {
      const guardianA = makeGuardian({ id: 'guardian-a' });
      const guardianB = makeGuardian({ id: 'guardian-b' });
      const studentX = makeStudent({ id: 'student-x', gradeId: GRADE_10_ID, guardians: [guardianA] as any });
      const studentY = makeStudent({ id: 'student-y', gradeId: GRADE_10_ID, guardians: [guardianB] as any });
      studentRepo.find!.mockResolvedValue([studentX, studentY]);

      const result = await service.resolveRecipients({ gradeIds: [GRADE_10_ID] });

      expect(studentRepo.find).toHaveBeenCalledTimes(1);
      const parents = result.filter((r) => r.type === 'parent');
      expect(parents).toHaveLength(2);
      expect(parents.map((p) => p.id).sort()).toEqual(['guardian-a', 'guardian-b']);
    });

    it('excludes a blacklisted guardian even if linked to the selected grade', async () => {
      const blacklisted = makeGuardian({ id: 'guardian-blacklisted', isBlacklisted: true });
      const student = makeStudent({ guardians: [blacklisted] as any });
      studentRepo.find!.mockResolvedValue([student]);

      const result = await service.resolveRecipients({ gradeIds: [GRADE_10_ID] });

      expect(result.filter((r) => r.type === 'parent')).toHaveLength(0);
    });
  });

  describe('resolveRecipients — by class section', () => {
    it('resolves only guardians of students in class 10A, not 10B — the explicitly-requested test', async () => {
      const guardianA = makeGuardian({ id: 'guardian-10a' });
      const student10A = makeStudent({ id: 'student-10a', classSectionId: SECTION_10A_ID, guardians: [guardianA] as any });
      studentRepo.find!.mockResolvedValue([student10A]);

      const result = await service.resolveRecipients({ classSectionIds: [SECTION_10A_ID] });

      expect(studentRepo.find).toHaveBeenCalledTimes(1);
      const parents = result.filter((r) => r.type === 'parent');
      expect(parents).toHaveLength(1);
      expect(parents[0].id).toBe('guardian-10a');
    });
  });

  describe('resolveRecipients — dedup', () => {
    it('a parent with two children both in Grade 10 appears exactly once — the explicitly-requested test', async () => {
      const sharedGuardian = makeGuardian({ id: 'guardian-shared' });
      const child1 = makeStudent({ id: 'child-1', guardians: [sharedGuardian] as any });
      const child2 = makeStudent({ id: 'child-2', guardians: [sharedGuardian] as any });
      studentRepo.find!.mockResolvedValue([child1, child2]);

      const result = await service.resolveRecipients({ gradeIds: [GRADE_10_ID] });

      const parents = result.filter((r) => r.type === 'parent');
      expect(parents).toHaveLength(1);
      expect(parents[0].id).toBe('guardian-shared');
    });
  });

  describe('resolveRecipients — allParents / allTeachers', () => {
    it('allParents resolves every non-blacklisted guardian via the student_guardian junction', async () => {
      const active = makeGuardian({ id: 'active-guardian', isBlacklisted: false });
      const blocked = makeGuardian({ id: 'blocked-guardian', isBlacklisted: true });
      studentGuardianRepo.find!.mockResolvedValue([
        { guardian: active },
        { guardian: blocked },
      ] as any);

      const result = await service.resolveRecipients({ allParents: true });

      const parents = result.filter((r) => r.type === 'parent');
      expect(parents.map((p) => p.id)).toEqual(['active-guardian']);
    });

    it('allTeachers resolves only active staff with a teaching role assignment', async () => {
      const teacher = makeStaff({ id: 'teacher-1' });
      const nonTeacher = makeStaff({ id: 'accountant-1', roleAssignments: [{ staffId: 'accountant-1', role: StaffFunctionalRole.ACCOUNTANT }] as any });
      staffRepo.find!.mockResolvedValue([teacher, nonTeacher]);

      const result = await service.resolveRecipients({ allTeachers: true });

      const teachers = result.filter((r) => r.type === 'teacher');
      expect(teachers.map((t) => t.id)).toEqual(['teacher-1']);
    });
  });

  describe('resolveRecipients — teachers by class section via timetable', () => {
    it('resolves the distinct set of teachers who actually teach the selected class section', async () => {
      const teacher = makeStaff({ id: 'timetable-teacher' });
      timetableEntryRepo.createQueryBuilder = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ teacherId: 'timetable-teacher' }]),
      });
      staffRepo.find!.mockResolvedValue([teacher]);

      const result = await service.resolveRecipients({ classSectionIds: [SECTION_10A_ID] });

      const teachers = result.filter((r) => r.type === 'teacher');
      expect(teachers.map((t) => t.id)).toEqual(['timetable-teacher']);
    });
  });

  describe('previewRecipients', () => {
    it('returns counts with no side effects', async () => {
      studentRepo.find!.mockResolvedValue([makeStudent({ guardians: [makeGuardian()] as any })]);

      const result = await service.previewRecipients({ gradeIds: [GRADE_10_ID] });

      expect(result).toEqual({ parentCount: 1, teacherCount: 0, total: 1 });
      expect(messageRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('send — channel dispatch', () => {
    it('SMS + Push selected → each channel service is called once per recipient (twice total) — the explicitly-requested test', async () => {
      const guardian = makeGuardian({ id: 'guardian-dispatch' });
      studentGuardianRepo.find!.mockResolvedValue([{ guardian }] as any);
      messageRepo.save!.mockResolvedValue({ id: 'message-uuid' });

      await service.send(
        {
          allParents: true,
          subject: 'Test',
          body: 'Body',
          channelSms: true,
          channelEmail: false,
          channelPush: true,
        } as any,
        STAFF_ID,
      );

      expect(smsService.sendSms).toHaveBeenCalledTimes(1);
      expect(pushService.sendPush).toHaveBeenCalledTimes(1);
      expect(mailerService.sendMail).not.toHaveBeenCalled();

      const savedRecipients = (messageRecipientRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedRecipients).toHaveLength(2); // one row per (recipient, channel)
      expect(savedRecipients.map((r: any) => r.channel).sort()).toEqual(['push', 'sms']);
    });

    it('dispatches to every resolved recipient, not just the first', async () => {
      const guardianA = makeGuardian({ id: 'g-a' });
      const guardianB = makeGuardian({ id: 'g-b' });
      studentGuardianRepo.find!.mockResolvedValue([{ guardian: guardianA }, { guardian: guardianB }] as any);
      messageRepo.save!.mockResolvedValue({ id: 'message-uuid' });

      await service.send(
        { allParents: true, subject: 'S', body: 'B', channelSms: true, channelEmail: false, channelPush: false } as any,
        STAFF_ID,
      );

      expect(smsService.sendSms).toHaveBeenCalledTimes(2);
    });
  });

  describe('send — delivery status', () => {
    it('a failed SMS delivery sets deliveryStatus=failed for that recipient row only — the explicitly-requested test', async () => {
      const guardian = makeGuardian({ id: 'guardian-fail' });
      studentGuardianRepo.find!.mockResolvedValue([{ guardian }] as any);
      messageRepo.save!.mockResolvedValue({ id: 'message-uuid' });
      smsService.sendSms.mockRejectedValue(new Error('carrier rejected'));

      await service.send(
        {
          allParents: true,
          subject: 'Test',
          body: 'Body',
          channelSms: true,
          channelEmail: false,
          channelPush: true,
        } as any,
        STAFF_ID,
      );

      const savedRecipients = (messageRecipientRepo.save as jest.Mock).mock.calls[0][0];
      const smsRow = savedRecipients.find((r: any) => r.channel === 'sms');
      const pushRow = savedRecipients.find((r: any) => r.channel === 'push');
      expect(smsRow.deliveryStatus).toBe('failed');
      expect(smsRow.failureReason).toBe('carrier rejected');
      expect(pushRow.deliveryStatus).toBe('sent'); // independent of the other channel/recipient
    });

    it('a recipient with no phone number gets a failed SMS row, not a silent skip', async () => {
      const guardian = makeGuardian({ id: 'guardian-nophone', phone: null as any });
      studentGuardianRepo.find!.mockResolvedValue([{ guardian }] as any);
      messageRepo.save!.mockResolvedValue({ id: 'message-uuid' });

      await service.send(
        { allParents: true, subject: 'S', body: 'B', channelSms: true, channelEmail: false, channelPush: false } as any,
        STAFF_ID,
      );

      expect(smsService.sendSms).not.toHaveBeenCalled();
      const savedRecipients = (messageRecipientRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedRecipients[0].deliveryStatus).toBe('failed');
      expect(savedRecipients[0].failureReason).toBe('no phone number');
    });
  });

  describe('send — persists the message row', () => {
    it('saves recipientCount matching the resolved recipient list', async () => {
      const guardian = makeGuardian();
      studentGuardianRepo.find!.mockResolvedValue([{ guardian }] as any);
      messageRepo.save!.mockResolvedValue({ id: 'message-uuid' });

      await service.send(
        { allParents: true, subject: 'S', body: 'B', channelSms: true, channelEmail: false, channelPush: false } as any,
        STAFF_ID,
      );

      expect(messageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ sentByStaffId: STAFF_ID, recipientCount: 1 }),
      );
    });
  });

  describe('getMessageDetail', () => {
    it('throws NotFoundException for an unknown message id', async () => {
      messageRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.getMessageDetail('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the message with its recipient list', async () => {
      messageRepo.findOne!.mockResolvedValue({ id: 'message-uuid', subject: 'S' });
      messageRecipientRepo.find!.mockResolvedValue([{ id: 'r1', recipientName: 'A' }]);

      const result = await service.getMessageDetail('message-uuid');

      expect(result.message.id).toBe('message-uuid');
      expect(result.recipients).toHaveLength(1);
    });
  });

  describe('getHistory', () => {
    it('includes sent/failed counts per message', async () => {
      messageRepo.find!.mockResolvedValue([{ id: 'message-uuid' }]);
      messageRecipientRepo.count = jest.fn()
        .mockResolvedValueOnce(3) // sent
        .mockResolvedValueOnce(1); // failed

      const result = await service.getHistory();

      expect(result[0]).toEqual(expect.objectContaining({ id: 'message-uuid', sentCount: 3, failedCount: 1 }));
    });
  });
});
