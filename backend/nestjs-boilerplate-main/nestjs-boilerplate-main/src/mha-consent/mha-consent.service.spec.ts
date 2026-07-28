import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { MhaConsentService } from './mha-consent.service';
import { MhaConsentEntity, MhaConsentMethod } from './entities/mha-consent.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const STUDENT_ID = 'student-uuid';
const STAFF_ID = 'counselor-staff-uuid';

const STUDENT = { id: STUDENT_ID, firstName: 'Kasun', lastName: 'Bandara' };

describe('MhaConsentService', () => {
  let service: MhaConsentService;
  let consentRepo: MockRepo<MhaConsentEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let sgRepo: MockRepo<StudentGuardianEntity>;
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let manager: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    consentRepo = repoMock<MhaConsentEntity>();
    studentRepo = repoMock<StudentEntity>();
    sgRepo = repoMock<StudentGuardianEntity>();
    studentRepo.findOne!.mockResolvedValue(STUDENT);
    sgRepo.findOne!.mockResolvedValue({ studentId: STUDENT_ID, guardianId: 'guardian-uuid' });

    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };

    manager = {
      findOne: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_entity: unknown, data: unknown) => data),
      save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve({ id: 'consent-new-id', ...(data as object) })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MhaConsentService,
        { provide: getRepositoryToken(MhaConsentEntity), useValue: consentRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<MhaConsentService>(MhaConsentService);
  });

  const dto = {
    guardianName: 'Sunethra Perera',
    guardianContact: '+94 71 234 5678',
    method: MhaConsentMethod.WRITTEN,
  };

  describe('recordConsent', () => {
    it('creates a new active consent when none exists', async () => {
      manager.findOne.mockResolvedValue(undefined);
      const result = await service.recordConsent(STUDENT_ID, dto, STAFF_ID);

      expect(manager.save).toHaveBeenCalledWith(
        MhaConsentEntity,
        expect.objectContaining({ studentId: STUDENT_ID, guardianName: dto.guardianName, supersededAt: null }),
      );
      expect(manager.update).not.toHaveBeenCalled();
      expect(result.id).toBe('consent-new-id');
    });

    it('supersedes the prior active consent when one exists', async () => {
      const previous = { id: 'consent-old-id', studentId: STUDENT_ID, supersededAt: null };
      manager.findOne.mockResolvedValue(previous);

      await service.recordConsent(STUDENT_ID, dto, STAFF_ID);

      expect(manager.update).toHaveBeenCalledTimes(2);
      expect(manager.update.mock.calls[0][2].supersededAt).toBeInstanceOf(Date);
      expect(manager.update).toHaveBeenCalledWith(
        MhaConsentEntity,
        { id: 'consent-old-id' },
        expect.objectContaining({ supersededByConsentId: 'consent-new-id' }),
      );
    });

    it('regression guard: supersedes the previous row BEFORE inserting the new one — both rows must never share supersededAt IS NULL at the same time (violates the DB partial unique index)', async () => {
      const previous = { id: 'consent-old-id', studentId: STUDENT_ID, supersededAt: null };
      manager.findOne.mockResolvedValue(previous);
      const callOrder: string[] = [];
      manager.update.mockImplementation((..._args: unknown[]) => {
        callOrder.push('update');
        return Promise.resolve({ affected: 1 });
      });
      manager.save.mockImplementation((_entity: unknown, data: unknown) => {
        callOrder.push('save');
        return Promise.resolve({ id: 'consent-new-id', ...(data as object) });
      });

      await service.recordConsent(STUDENT_ID, dto, STAFF_ID);

      expect(callOrder).toEqual(['update', 'save', 'update']);
    });

    it('throws NotFoundException for an unknown student', async () => {
      studentRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.recordConsent(STUDENT_ID, dto, STAFF_ID)).rejects.toThrow(NotFoundException);
    });

    it('rejects a guardianId not linked to this student with 422', async () => {
      sgRepo.findOne!.mockResolvedValue(undefined);
      await expect(
        service.recordConsent(STUDENT_ID, { ...dto, guardianId: 'unlinked-guardian' }, STAFF_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('writes an audit log entry', async () => {
      manager.findOne.mockResolvedValue(undefined);
      const result = await service.recordConsent(STUDENT_ID, dto, STAFF_ID);
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: STAFF_ID,
        action: 'record_consent',
        targetType: 'mha_consent',
        targetId: result.id,
      });
    });
  });

  describe('getConsentStatus', () => {
    it('returns null current and empty history when nothing recorded', async () => {
      consentRepo.findOne!.mockResolvedValue(undefined);
      consentRepo.find!.mockResolvedValue([]);
      const status = await service.getConsentStatus(STUDENT_ID);
      expect(status).toEqual({ current: null, history: [] });
    });

    it('returns the current consent and full history', async () => {
      const current = { id: 'consent-2', studentId: STUDENT_ID, supersededAt: null };
      const superseded = { id: 'consent-1', studentId: STUDENT_ID, supersededAt: new Date() };
      consentRepo.findOne!.mockResolvedValue(current);
      consentRepo.find!.mockResolvedValue([current, superseded]);

      const status = await service.getConsentStatus(STUDENT_ID);
      expect(status.current?.id).toBe('consent-2');
      expect(status.history).toHaveLength(2);
    });
  });

  describe('assertConsentExists — the explicitly-requested gate tests', () => {
    it('(a) throws ConflictException when no active consent exists', async () => {
      consentRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.assertConsentExists(STUDENT_ID)).rejects.toThrow(ConflictException);
    });

    it('(b) resolves without throwing after a consent has been recorded', async () => {
      consentRepo.findOne!.mockResolvedValue({ id: 'consent-1', studentId: STUDENT_ID, supersededAt: null });
      await expect(service.assertConsentExists(STUDENT_ID)).resolves.toBeUndefined();
    });
  });
});
