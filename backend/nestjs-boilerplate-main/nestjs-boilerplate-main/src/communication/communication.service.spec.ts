import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ObjectLiteral, Repository } from 'typeorm';
import { CommunicationService } from './communication.service';
import { EmergencyAlertEntity } from './entities/emergency-alert.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';
import { MailerService } from '../mailer/mailer.service';

// ─── Mock repo factory (same pattern as library.service.spec.ts) ───────────

type MockRepo<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

// ─── Test data helpers ──────────────────────────────────────────────────────

const makeGuardian = (overrides: Partial<GuardianEntity> = {}): GuardianEntity =>
  ({
    id: 'guardian-1',
    firstName: 'Kamala',
    lastName: 'Perera',
    phone: '+94771234567',
    email: 'kamala@example.com',
    pushToken: 'fcm-token-guardian-1',
    isBlacklisted: false,
    ...overrides,
  } as GuardianEntity);

const makeSgRow = (guardian: GuardianEntity, studentId = 'student-1') =>
  ({ studentId, guardian } as unknown as StudentGuardianEntity);

const makeStaff = (overrides: Partial<StaffEntity> = {}): StaffEntity =>
  ({
    id: 'staff-1',
    firstName: 'Nimal',
    lastName: 'Silva',
    email: 'nimal@school.lk',
    phone: '+94719876543',
    pushToken: 'fcm-token-staff-1',
    status: StaffStatus.ACTIVE,
    ...overrides,
  } as StaffEntity);

const makeAlert = (overrides = {}): EmergencyAlertEntity =>
  ({
    id: 'alert-uuid-1',
    message: 'Fire drill now!',
    sentByStaffId: 'staff-principal-1',
    sentAt: new Date('2026-07-01T10:00:00Z'),
    ...overrides,
  } as EmergencyAlertEntity);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CommunicationService.sendEmergencyAlert', () => {
  let service: CommunicationService;
  let alertRepo: MockRepo<EmergencyAlertEntity>;
  let logRepo: MockRepo<NotificationLogEntity>;
  let guardianRepo: MockRepo<GuardianEntity>;
  let sgRepo: MockRepo<StudentGuardianEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };
  let mailerService: { sendMail: jest.Mock };

  beforeEach(async () => {
    alertRepo = repoMock<EmergencyAlertEntity>();
    logRepo = repoMock<NotificationLogEntity>();
    guardianRepo = repoMock<GuardianEntity>();
    sgRepo = repoMock<StudentGuardianEntity>();
    staffRepo = repoMock<StaffEntity>();
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };
    mailerService = { sendMail: jest.fn().mockResolvedValue(undefined) };

    // Default: alert saved with an id
    alertRepo.save!.mockImplementation((d: unknown) =>
      Promise.resolve({ ...makeAlert(), ...(d as object) }),
    );
    // Default: create just passes the object through
    alertRepo.create!.mockImplementation((d: Partial<EmergencyAlertEntity>) => d as EmergencyAlertEntity);
    logRepo.create!.mockImplementation((d: Partial<NotificationLogEntity>) => d as NotificationLogEntity);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationService,
        { provide: getRepositoryToken(EmergencyAlertEntity), useValue: alertRepo },
        { provide: getRepositoryToken(NotificationLogEntity), useValue: logRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
        { provide: MailerService, useValue: mailerService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('/app'),
            get: jest.fn().mockReturnValue('Test School'),
          },
        },
      ],
    }).compile();

    service = module.get<CommunicationService>(CommunicationService);
  });

  // ── Test 1: Alert entity persisted before fan-out ──────────────────────────

  it('persists an EmergencyAlertEntity before dispatching to channels', async () => {
    sgRepo.find!.mockResolvedValue([]);
    staffRepo.find!.mockResolvedValue([]);
    logRepo.save!.mockResolvedValue([]);

    await service.sendEmergencyAlert('Fire!', 'staff-principal-1');

    expect(alertRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Fire!', sentByStaffId: 'staff-principal-1' }),
    );
  });

  // ── Test 2: All 3 channels invoked per guardian ────────────────────────────

  it('invokes SMS, push, and email for each guardian', async () => {
    const g = makeGuardian();
    sgRepo.find!.mockResolvedValue([makeSgRow(g)]);
    staffRepo.find!.mockResolvedValue([]);
    logRepo.save!.mockResolvedValue([]);

    await service.sendEmergencyAlert('Evacuate now.', 'staff-p1');

    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
    expect(smsService.sendSms).toHaveBeenCalledWith(g.phone, 'Evacuate now.');
    expect(pushService.sendPush).toHaveBeenCalledTimes(1);
    expect(pushService.sendPush).toHaveBeenCalledWith(g.pushToken, 'Emergency Alert', 'Evacuate now.');
    expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: g.email }),
    );
  });

  // ── Test 3: All 3 channels invoked per active staff ───────────────────────

  it('invokes SMS, push, and email for each active staff member', async () => {
    const s = makeStaff();
    sgRepo.find!.mockResolvedValue([]);
    staffRepo.find!.mockResolvedValue([s]);
    logRepo.save!.mockResolvedValue([]);

    await service.sendEmergencyAlert('Storm warning.', 'staff-p1');

    expect(smsService.sendSms).toHaveBeenCalledWith(s.phone, 'Storm warning.');
    expect(pushService.sendPush).toHaveBeenCalledWith(s.pushToken, 'Emergency Alert', 'Storm warning.');
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: s.email }),
    );
  });

  // ── Test 4: Inactive staff excluded ───────────────────────────────────────

  it('does not send to resigned staff (only active staff are loaded)', async () => {
    // staffRepo.find is called with where: { status: ACTIVE }
    // simulate it returning empty (as if resigned staff filtered by TypeORM)
    sgRepo.find!.mockResolvedValue([]);
    staffRepo.find!.mockResolvedValue([]);
    logRepo.save!.mockResolvedValue([]);

    const summary = await service.sendEmergencyAlert('Alert.', 'staff-p1');

    expect(smsService.sendSms).not.toHaveBeenCalled();
    expect(summary.totalRecipients).toBe(0);
  });

  // ── Test 5: Guardian deduplication ────────────────────────────────────────

  it('sends to each unique guardian only once even if linked to multiple students', async () => {
    const g = makeGuardian();
    // Same guardian linked to two students
    sgRepo.find!.mockResolvedValue([
      makeSgRow(g, 'student-1'),
      makeSgRow(g, 'student-2'),
    ]);
    staffRepo.find!.mockResolvedValue([]);
    logRepo.save!.mockResolvedValue([]);

    await service.sendEmergencyAlert('Drill!', 'staff-p1');

    // Only 3 calls total (1 guardian × 3 channels), not 6
    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
    expect(pushService.sendPush).toHaveBeenCalledTimes(1);
    expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
  });

  // ── Test 6: Blacklisted guardian excluded ─────────────────────────────────

  it('excludes blacklisted guardians from the fan-out', async () => {
    const g = makeGuardian({ isBlacklisted: true });
    sgRepo.find!.mockResolvedValue([makeSgRow(g)]);
    staffRepo.find!.mockResolvedValue([]);
    logRepo.save!.mockResolvedValue([]);

    const summary = await service.sendEmergencyAlert('Alert.', 'staff-p1');

    expect(smsService.sendSms).not.toHaveBeenCalled();
    expect(summary.totalRecipients).toBe(0);
  });

  // ── Test 7: Push failure does not block SMS + email ───────────────────────

  it('logs push as failed but still sends SMS and email when push throws', async () => {
    const g = makeGuardian();
    sgRepo.find!.mockResolvedValue([makeSgRow(g)]);
    staffRepo.find!.mockResolvedValue([]);
    pushService.sendPush.mockRejectedValue(new Error('FCM error'));
    const savedLogs: unknown[] = [];
    logRepo.save!.mockImplementation((arr: unknown) => {
      (arr as unknown[]).forEach((l) => savedLogs.push(l));
      return Promise.resolve(arr);
    });

    const summary = await service.sendEmergencyAlert('Alert!', 'staff-p1');

    expect(smsService.sendSms).toHaveBeenCalled();
    expect(mailerService.sendMail).toHaveBeenCalled();
    expect(summary.failedCount).toBe(1);
    expect(summary.sentCount).toBe(2);

    const pushLog = (savedLogs as NotificationLogEntity[]).find((l) => l.channel === 'push');
    expect(pushLog?.status).toBe('failed');
    expect(pushLog?.failureReason).toBe('FCM error');
    const smsLog = (savedLogs as NotificationLogEntity[]).find((l) => l.channel === 'sms');
    expect(smsLog?.status).toBe('sent');
  });

  // ── Test 8: SMS failure does not block push + email ───────────────────────

  it('logs SMS as failed but still sends push and email when SMS throws', async () => {
    const g = makeGuardian();
    sgRepo.find!.mockResolvedValue([makeSgRow(g)]);
    staffRepo.find!.mockResolvedValue([]);
    smsService.sendSms.mockRejectedValue(new Error('Twilio error'));
    const savedLogs: NotificationLogEntity[] = [];
    logRepo.save!.mockImplementation((arr: unknown) => {
      (arr as NotificationLogEntity[]).forEach((l) => savedLogs.push(l));
      return Promise.resolve(arr);
    });

    await service.sendEmergencyAlert('Alert!', 'staff-p1');

    expect(pushService.sendPush).toHaveBeenCalled();
    expect(mailerService.sendMail).toHaveBeenCalled();
    const smsLog = savedLogs.find((l) => l.channel === 'sms');
    expect(smsLog?.status).toBe('failed');
    expect(smsLog?.failureReason).toBe('Twilio error');
  });

  // ── Test 9: Email failure does not block SMS + push ───────────────────────

  it('logs email as failed but still sends SMS and push when email throws', async () => {
    const g = makeGuardian();
    sgRepo.find!.mockResolvedValue([makeSgRow(g)]);
    staffRepo.find!.mockResolvedValue([]);
    mailerService.sendMail.mockRejectedValue(new Error('SMTP error'));
    const savedLogs: NotificationLogEntity[] = [];
    logRepo.save!.mockImplementation((arr: unknown) => {
      (arr as NotificationLogEntity[]).forEach((l) => savedLogs.push(l));
      return Promise.resolve(arr);
    });

    await service.sendEmergencyAlert('Alert!', 'staff-p1');

    expect(smsService.sendSms).toHaveBeenCalled();
    expect(pushService.sendPush).toHaveBeenCalled();
    const emailLog = savedLogs.find((l) => l.channel === 'email');
    expect(emailLog?.status).toBe('failed');
    expect(emailLog?.failureReason).toBe('SMTP error');
  });

  // ── Test 10: Null pushToken on staff → push fails, others succeed ─────────

  it('logs push as failed for staff with no push token, SMS and email still succeed', async () => {
    const s = makeStaff({ pushToken: null });
    sgRepo.find!.mockResolvedValue([]);
    staffRepo.find!.mockResolvedValue([s]);
    const savedLogs: NotificationLogEntity[] = [];
    logRepo.save!.mockImplementation((arr: unknown) => {
      (arr as NotificationLogEntity[]).forEach((l) => savedLogs.push(l));
      return Promise.resolve(arr);
    });

    const summary = await service.sendEmergencyAlert('Alert!', 'staff-p1');

    expect(smsService.sendSms).toHaveBeenCalled();
    expect(mailerService.sendMail).toHaveBeenCalled();
    const pushLog = savedLogs.find((l) => l.channel === 'push');
    expect(pushLog?.status).toBe('failed');
    expect(pushLog?.failureReason).toBe('no push token');
    expect(summary.failedCount).toBe(1);
    expect(summary.sentCount).toBe(2);
  });

  // ── Test 11: Null email on guardian → email fails, SMS + push succeed ─────

  it('logs email as failed for guardian with no email, SMS and push still succeed', async () => {
    const g = makeGuardian({ email: null });
    sgRepo.find!.mockResolvedValue([makeSgRow(g)]);
    staffRepo.find!.mockResolvedValue([]);
    const savedLogs: NotificationLogEntity[] = [];
    logRepo.save!.mockImplementation((arr: unknown) => {
      (arr as NotificationLogEntity[]).forEach((l) => savedLogs.push(l));
      return Promise.resolve(arr);
    });

    const summary = await service.sendEmergencyAlert('Alert!', 'staff-p1');

    expect(smsService.sendSms).toHaveBeenCalled();
    expect(pushService.sendPush).toHaveBeenCalled();
    const emailLog = savedLogs.find((l) => l.channel === 'email');
    expect(emailLog?.status).toBe('failed');
    expect(emailLog?.failureReason).toBe('no email address');
    expect(summary.failedCount).toBe(1);
    expect(summary.sentCount).toBe(2);
  });

  // ── Test 12: All logs saved in a single batch call ────────────────────────

  it('persists all notification logs in a single logRepo.save call', async () => {
    const g = makeGuardian();
    const s = makeStaff();
    sgRepo.find!.mockResolvedValue([makeSgRow(g)]);
    staffRepo.find!.mockResolvedValue([s]);
    logRepo.save!.mockResolvedValue([]);

    await service.sendEmergencyAlert('Alert!', 'staff-p1');

    // 1 guardian × 3 + 1 staff × 3 = 6 log rows, saved once
    expect(logRepo.save).toHaveBeenCalledTimes(1);
    const [savedArray] = (logRepo.save as jest.Mock).mock.calls[0] as [NotificationLogEntity[]];
    expect(savedArray).toHaveLength(6);
  });
});
