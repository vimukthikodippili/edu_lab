import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { SafetyAlertsService } from './safety-alerts.service';
import { DeliveryChannel, DeliveryStatus, NotificationDeliveryLogEntity } from './entities/notification-delivery-log.entity';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StaffEntity } from '../staff/entities/staff.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn().mockResolvedValue([]),
});

describe('SafetyAlertsService', () => {
  let service: SafetyAlertsService;
  let logRepo: MockRepo<NotificationDeliveryLogEntity>;
  let sessionRepo: MockRepo<MhaSessionEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let staffRepo: MockRepo<StaffEntity>;

  beforeEach(async () => {
    logRepo = repoMock<NotificationDeliveryLogEntity>();
    sessionRepo = repoMock<MhaSessionEntity>();
    studentRepo = repoMock<StudentEntity>();
    staffRepo = repoMock<StaffEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyAlertsService,
        { provide: getRepositoryToken(NotificationDeliveryLogEntity), useValue: logRepo },
        { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
      ],
    }).compile();

    service = module.get<SafetyAlertsService>(SafetyAlertsService);
  });

  it('returns an empty array without querying enrichment tables when there are no delivery rows', async () => {
    logRepo.find!.mockResolvedValue([]);
    const result = await service.listAlerts();
    expect(result).toEqual([]);
    expect(sessionRepo.find).not.toHaveBeenCalled();
  });

  it('queries ordered by createdAt DESC and enriches with session/student/staff names', async () => {
    logRepo.find!.mockResolvedValue([
      {
        id: 'log-1',
        alertId: 'alert-1',
        sessionId: 'session-1',
        studentId: 'student-1',
        recipientStaffId: 'staff-1',
        channel: DeliveryChannel.SMS,
        status: DeliveryStatus.SENT,
        attempts: 1,
        lastAttemptAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    sessionRepo.find!.mockResolvedValue([{ id: 'session-1', caseNumber: 'SC-20260723-001' }]);
    studentRepo.find!.mockResolvedValue([{ id: 'student-1', firstName: 'Kasun', lastName: 'Bandara' }]);
    staffRepo.find!.mockResolvedValue([{ id: 'staff-1', firstName: 'Nadeesha', lastName: 'Perera' }]);

    const result = await service.listAlerts();

    expect(logRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    expect(result[0]).toMatchObject({
      caseNumber: 'SC-20260723-001',
      studentName: 'Kasun Bandara',
      recipientName: 'Nadeesha Perera',
      status: DeliveryStatus.SENT,
    });
  });

  it('falls back to "Unknown" placeholders when a linked record cannot be found, without throwing', async () => {
    logRepo.find!.mockResolvedValue([
      {
        id: 'log-1', alertId: 'a1', sessionId: 'missing-session', studentId: 'missing-student',
        recipientStaffId: 'missing-staff', channel: DeliveryChannel.PUSH, status: DeliveryStatus.FAILED,
        attempts: 4, lastAttemptAt: new Date(), createdAt: new Date(),
      },
    ]);
    sessionRepo.find!.mockResolvedValue([]);
    studentRepo.find!.mockResolvedValue([]);
    staffRepo.find!.mockResolvedValue([]);

    const result = await service.listAlerts();

    expect(result[0].caseNumber).toBe('Unknown Session');
    expect(result[0].studentName).toBe('Unknown Student');
    expect(result[0].recipientName).toBe('Unknown Staff');
  });
});
