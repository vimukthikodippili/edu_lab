import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { AbsenceNotificationListener } from './absence-notification.listener';
import { AbsenceMarkedEvent } from '../../attendance/events/absence-marked.event';
import { StudentEntity } from '../../students/entities/student.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { GuardianNotificationEntity } from '../entities/guardian-notification.entity';
import { SmsService } from '../sms/sms.service';
import { PushService } from '../push/push.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function mockRepo<T extends ObjectLiteral>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}

const STUDENT_ID = 'student-uuid-1111';
const GUARDIAN_ID = 'guardian-uuid-2222';
const ATTENDANCE_ID = 'attendance-uuid-3333';
const CLASS_SECTION_ID = 10;
const DATE = '2026-06-29';

function buildMockStudent(pushToken: string | null = 'fcm-token-abc') {
  return {
    id: STUDENT_ID,
    firstName: 'Kasun',
    lastName: 'Perera',
    studentGuardians: [
      {
        guardian: {
          id: GUARDIAN_ID,
          phone: '+94771234567',
          email: 'father@example.com',
          pushToken,
        },
      },
    ],
  };
}

const mockSection = {
  id: CLASS_SECTION_ID,
  name: 'A',
  academicYear: '2026',
  grade: { level: 10, name: 'Grade 10' },
};

describe('AbsenceNotificationListener', () => {
  let listener: AbsenceNotificationListener;
  let smsService: jest.Mocked<SmsService>;
  let pushService: jest.Mocked<PushService>;
  let studentRepo: MockRepo<StudentEntity>;
  let sectionRepo: MockRepo<ClassSectionEntity>;
  let guardianNotifRepo: MockRepo<GuardianNotificationEntity>;

  beforeEach(async () => {
    studentRepo = mockRepo<StudentEntity>();
    sectionRepo = mockRepo<ClassSectionEntity>();
    guardianNotifRepo = mockRepo<GuardianNotificationEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbsenceNotificationListener,
        {
          provide: getRepositoryToken(StudentEntity),
          useValue: studentRepo,
        },
        {
          provide: getRepositoryToken(ClassSectionEntity),
          useValue: sectionRepo,
        },
        {
          provide: getRepositoryToken(GuardianNotificationEntity),
          useValue: guardianNotifRepo,
        },
        {
          provide: SmsService,
          useValue: { sendSms: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: PushService,
          useValue: { sendPush: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    listener = module.get<AbsenceNotificationListener>(AbsenceNotificationListener);
    smsService = module.get(SmsService);
    pushService = module.get(PushService);

    // Default repository mocks
    (guardianNotifRepo.create as jest.Mock).mockImplementation((x) => x);
    (guardianNotifRepo.save as jest.Mock).mockResolvedValue({} as GuardianNotificationEntity);
  });

  afterEach(() => jest.clearAllMocks());

  it('sends SMS exactly once per absent record with correct phone and student name', async () => {
    (studentRepo.findOne as jest.Mock).mockResolvedValue(buildMockStudent());
    (sectionRepo.findOne as jest.Mock).mockResolvedValue(mockSection);

    const event = new AbsenceMarkedEvent(ATTENDANCE_ID, STUDENT_ID, CLASS_SECTION_ID, DATE);
    await listener.handle(event);

    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
    const [to, body] = (smsService.sendSms as jest.Mock).mock.calls[0];
    expect(to).toBe('+94771234567');
    expect(body).toContain('Kasun Perera');
    expect(body).toContain('Grade 10');
  });

  it('sends push notification exactly once when guardian has a pushToken', async () => {
    (studentRepo.findOne as jest.Mock).mockResolvedValue(buildMockStudent('fcm-token-abc'));
    (sectionRepo.findOne as jest.Mock).mockResolvedValue(mockSection);

    await listener.handle(new AbsenceMarkedEvent(ATTENDANCE_ID, STUDENT_ID, CLASS_SECTION_ID, DATE));

    expect(pushService.sendPush).toHaveBeenCalledTimes(1);
    const [token, title] = (pushService.sendPush as jest.Mock).mock.calls[0];
    expect(token).toBe('fcm-token-abc');
    expect(title).toBe('Absence Alert');
  });

  it('does NOT call sendPush when guardian pushToken is null', async () => {
    (studentRepo.findOne as jest.Mock).mockResolvedValue(buildMockStudent(null));
    (sectionRepo.findOne as jest.Mock).mockResolvedValue(mockSection);

    await listener.handle(new AbsenceMarkedEvent(ATTENDANCE_ID, STUDENT_ID, CLASS_SECTION_ID, DATE));

    expect(pushService.sendPush).not.toHaveBeenCalled();
  });

  it('saves guardian in-app notification with correct type and metadata', async () => {
    (studentRepo.findOne as jest.Mock).mockResolvedValue(buildMockStudent());
    (sectionRepo.findOne as jest.Mock).mockResolvedValue(mockSection);

    await listener.handle(new AbsenceMarkedEvent(ATTENDANCE_ID, STUDENT_ID, CLASS_SECTION_ID, DATE));

    expect(guardianNotifRepo.save).toHaveBeenCalledTimes(1);
    const created = (guardianNotifRepo.create as jest.Mock).mock.calls[0][0];
    expect(created.type).toBe('absence_alert');
    expect(created.guardianId).toBe(GUARDIAN_ID);
    expect(created.metadata.studentName).toBe('Kasun Perera');
    expect(created.metadata.date).toBe(DATE);
    expect(created.metadata.attendanceId).toBe(ATTENDANCE_ID);
  });

  it('sends SMS once per guardian when a student has multiple guardians', async () => {
    const studentWithTwo = {
      ...buildMockStudent(),
      studentGuardians: [
        {
          guardian: { id: 'g1', phone: '+94771111111', email: null, pushToken: null },
        },
        {
          guardian: { id: 'g2', phone: '+94772222222', email: null, pushToken: null },
        },
      ],
    };
    (studentRepo.findOne as jest.Mock).mockResolvedValue(studentWithTwo);
    (sectionRepo.findOne as jest.Mock).mockResolvedValue(mockSection);

    await listener.handle(new AbsenceMarkedEvent(ATTENDANCE_ID, STUDENT_ID, CLASS_SECTION_ID, DATE));

    expect(smsService.sendSms).toHaveBeenCalledTimes(2);
    expect(guardianNotifRepo.save).toHaveBeenCalledTimes(2);
  });

  it('returns early and does nothing when student is not found', async () => {
    (studentRepo.findOne as jest.Mock).mockResolvedValue(null);
    (sectionRepo.findOne as jest.Mock).mockResolvedValue(mockSection);

    await listener.handle(new AbsenceMarkedEvent(ATTENDANCE_ID, STUDENT_ID, CLASS_SECTION_ID, DATE));

    expect(smsService.sendSms).not.toHaveBeenCalled();
    expect(guardianNotifRepo.save).not.toHaveBeenCalled();
  });
});
