import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubjectSelectionService } from './subject-selection.service';
import { SubjectSelectionWindowService } from './subject-selection-window.service';
import { GradeStageService } from '../students/grade-stage.service';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';
import { StudentEntity } from '../students/entities/student.entity';
import { ALStreamEntity } from './entities/al-stream.entity';
import { ALStreamSubjectEntity } from './entities/al-stream-subject.entity';
import {
  SubjectSelectionWindowCoreSubjectEntity,
  SubjectSelectionWindowOptionalSubjectEntity,
} from './entities/subject-selection-window-subject.entity';
import { SubjectSelectionWindowEntity } from './entities/subject-selection-window.entity';
import {
  SubjectSelectionRequestEntity,
  SubjectSelectionStatus,
} from './entities/subject-selection-request.entity';
import {
  SubjectSelectionRequestItemEntity,
  SubjectSelectionType,
} from './entities/subject-selection-request-item.entity';
import { CareerAssessmentEntity } from '../career/entities/career-assessment.entity';

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((x: any) => Promise.resolve(x)),
  create: jest.fn((data: Partial<T>) => data as T),
  createQueryBuilder: jest.fn(),
});

const makeEntityManager = (): any => ({
  // Mirrors TypeORM's two overloads: save(entity) and save(EntityClass, entityOrArray).
  save: jest.fn((a: any, b?: any) => Promise.resolve(b !== undefined ? b : a)),
  create: jest.fn((_, data: any) => data),
  query: jest.fn().mockResolvedValue([]),
});

const studentId = 'student-uuid';
const windowId = 'window-uuid';
const gradeStageId = 'grade-stage-uuid';

const makeStudent = (overrides: Partial<StudentEntity> = {}): StudentEntity =>
  ({
    id: studentId,
    firstName: 'Nimal',
    lastName: 'Perera',
    userId: 42,
    grade: { id: 10, name: 'Grade 10', level: 10 },
    guardians: [{ id: 'guardian-uuid', firstName: 'Kamal', lastName: 'Perera' }],
    ...overrides,
  } as unknown as StudentEntity);

const makeWindow = (overrides: Partial<SubjectSelectionWindowEntity> = {}): SubjectSelectionWindowEntity =>
  ({
    id: windowId,
    gradeStageId,
    academicYear: '2026',
    openDate: new Date('2026-01-01'),
    closeDate: new Date('2026-12-31'),
    isActive: true,
    minOptionalSubjects: 1,
    maxOptionalSubjects: 3,
    requiresStreamSelection: false,
    ...overrides,
  } as SubjectSelectionWindowEntity);

describe('SubjectSelectionService', () => {
  let service: SubjectSelectionService;
  let studentRepo: jest.Mocked<Repository<StudentEntity>>;
  let streamRepo: jest.Mocked<Repository<ALStreamEntity>>;
  let streamSubjectRepo: jest.Mocked<Repository<ALStreamSubjectEntity>>;
  let coreSubjectRepo: jest.Mocked<Repository<SubjectSelectionWindowCoreSubjectEntity>>;
  let optionalSubjectRepo: jest.Mocked<Repository<SubjectSelectionWindowOptionalSubjectEntity>>;
  let requestRepo: jest.Mocked<Repository<SubjectSelectionRequestEntity>>;
  let itemRepo: jest.Mocked<Repository<SubjectSelectionRequestItemEntity>>;
  let careerAssessmentRepo: jest.Mocked<Repository<CareerAssessmentEntity>>;
  let windowService: { findActiveWindowForGradeStage: jest.Mock };
  let gradeStageService: { resolveStageForLevel: jest.Mock };
  let notificationService: { createForStudent: jest.Mock; createForGuardian: jest.Mock };
  let auditService: { log: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let em: ReturnType<typeof makeEntityManager>;

  beforeEach(async () => {
    studentRepo = repoMock<StudentEntity>() as any;
    streamRepo = repoMock<ALStreamEntity>() as any;
    streamSubjectRepo = repoMock<ALStreamSubjectEntity>() as any;
    coreSubjectRepo = repoMock<SubjectSelectionWindowCoreSubjectEntity>() as any;
    optionalSubjectRepo = repoMock<SubjectSelectionWindowOptionalSubjectEntity>() as any;
    requestRepo = repoMock<SubjectSelectionRequestEntity>() as any;
    itemRepo = repoMock<SubjectSelectionRequestItemEntity>() as any;
    careerAssessmentRepo = repoMock<CareerAssessmentEntity>() as any;

    windowService = { findActiveWindowForGradeStage: jest.fn() };
    gradeStageService = { resolveStageForLevel: jest.fn().mockResolvedValue({ id: gradeStageId }) };
    notificationService = { createForStudent: jest.fn().mockResolvedValue({}), createForGuardian: jest.fn().mockResolvedValue({}) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    eventEmitter = { emit: jest.fn() };
    em = makeEntityManager();
    dataSource = { transaction: jest.fn().mockImplementation((fn: any) => fn(em)) };

    studentRepo.findOne.mockResolvedValue(makeStudent());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectSelectionService,
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ALStreamEntity), useValue: streamRepo },
        { provide: getRepositoryToken(ALStreamSubjectEntity), useValue: streamSubjectRepo },
        { provide: getRepositoryToken(SubjectSelectionWindowCoreSubjectEntity), useValue: coreSubjectRepo },
        { provide: getRepositoryToken(SubjectSelectionWindowOptionalSubjectEntity), useValue: optionalSubjectRepo },
        { provide: getRepositoryToken(SubjectSelectionRequestEntity), useValue: requestRepo },
        { provide: getRepositoryToken(SubjectSelectionRequestItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(CareerAssessmentEntity), useValue: careerAssessmentRepo },
        { provide: SubjectSelectionWindowService, useValue: windowService },
        { provide: GradeStageService, useValue: gradeStageService },
        { provide: NotificationService, useValue: notificationService },
        { provide: AuditService, useValue: auditService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(SubjectSelectionService);
  });

  describe('submitRequest — window gating', () => {
    it('throws 400 when no active window exists for the student\'s grade stage (closed/expired/none)', async () => {
      windowService.findActiveWindowForGradeStage.mockResolvedValue(null);

      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['s1'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitRequest — min/max optional-count validation', () => {
    beforeEach(() => {
      windowService.findActiveWindowForGradeStage.mockResolvedValue(makeWindow());
      requestRepo.findOne.mockResolvedValue(null);
      optionalSubjectRepo.find.mockResolvedValue([
        { windowId, subjectId: 's1' } as any,
        { windowId, subjectId: 's2' } as any,
        { windowId, subjectId: 's3' } as any,
        { windowId, subjectId: 's4' } as any,
      ]);
      coreSubjectRepo.find.mockResolvedValue([{ windowId, subjectId: 'core-1' } as any]);
    });

    it('rejects too few optional subjects (below minOptionalSubjects)', async () => {
      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects too many optional subjects (above maxOptionalSubjects)', async () => {
      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['s1', 's2', 's3', 's4'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an optional subject id that is not in the window\'s pool', async () => {
      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['not-in-pool'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('succeeds within [min, max] and creates core + optional items', async () => {
      const result = await service.submitRequest(studentId, { optionalSubjectIds: ['s1', 's2'] });
      expect(result).toBeDefined();
      expect(em.save).toHaveBeenCalledWith(
        SubjectSelectionRequestItemEntity,
        expect.arrayContaining([
          expect.objectContaining({ subjectId: 'core-1', selectionType: SubjectSelectionType.CORE }),
          expect.objectContaining({ subjectId: 's1', selectionType: SubjectSelectionType.OPTIONAL }),
          expect.objectContaining({ subjectId: 's2', selectionType: SubjectSelectionType.OPTIONAL }),
        ]),
      );
    });
  });

  describe('submitRequest — duplicate pending / resubmission-after-reject', () => {
    beforeEach(() => {
      windowService.findActiveWindowForGradeStage.mockResolvedValue(makeWindow());
      optionalSubjectRepo.find.mockResolvedValue([{ windowId, subjectId: 's1' } as any]);
      coreSubjectRepo.find.mockResolvedValue([]);
    });

    it('throws 409 when a PENDING request already exists for this window', async () => {
      requestRepo.findOne.mockResolvedValue({ status: SubjectSelectionStatus.PENDING } as any);

      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['s1'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 409 when the last request for this window was already APPROVED', async () => {
      requestRepo.findOne.mockResolvedValue({ status: SubjectSelectionStatus.APPROVED } as any);

      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['s1'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('allows a new submission when the only existing request was REJECTED (resubmission)', async () => {
      requestRepo.findOne.mockResolvedValue({ status: SubjectSelectionStatus.REJECTED } as any);

      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['s1'] }),
      ).resolves.toBeDefined();
    });

    it('allows submission when no prior request exists at all for this window', async () => {
      requestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['s1'] }),
      ).resolves.toBeDefined();
    });
  });

  describe('submitRequest — aesthetic window (Grade 6-9, min=max=1, no stream)', () => {
    beforeEach(() => {
      windowService.findActiveWindowForGradeStage.mockResolvedValue(
        makeWindow({ minOptionalSubjects: 1, maxOptionalSubjects: 1, requiresStreamSelection: false }),
      );
      requestRepo.findOne.mockResolvedValue(null);
      optionalSubjectRepo.find.mockResolvedValue([
        { windowId, subjectId: 'art' } as any,
        { windowId, subjectId: 'music' } as any,
        { windowId, subjectId: 'dance' } as any,
      ]);
      coreSubjectRepo.find.mockResolvedValue([{ windowId, subjectId: 'core-1' } as any]);
    });

    it('accepts exactly one aesthetic subject — same code path as the elective flow', async () => {
      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['music'] }),
      ).resolves.toBeDefined();
    });

    it('rejects zero or two aesthetic subjects under the same min=max=1 rule', async () => {
      await expect(service.submitRequest(studentId, { optionalSubjectIds: [] })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.submitRequest(studentId, { optionalSubjectIds: ['music', 'art'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableSubjects — RIASEC advisory never filters the subject list (compliance)', () => {
    beforeEach(() => {
      windowService.findActiveWindowForGradeStage.mockResolvedValue(makeWindow());
      coreSubjectRepo.find.mockResolvedValue([{ windowId, subjectId: 'core-1', subject: { id: 'core-1' } } as any]);
      optionalSubjectRepo.find.mockResolvedValue([
        { windowId, subjectId: 's1', subject: { id: 's1' } } as any,
        { windowId, subjectId: 's2', subject: { id: 's2' } } as any,
      ]);
      requestRepo.findOne.mockResolvedValue(null);
    });

    it('returns the identical subject list whether or not the student has taken RIASEC', async () => {
      careerAssessmentRepo.findOne.mockResolvedValueOnce(null);
      const withoutRiasec = await service.getAvailableSubjects(studentId);

      careerAssessmentRepo.findOne.mockResolvedValueOnce({
        riasecSuggestions: [{ dimension: 'investigative', label: 'Investigative', description: 'x' }],
      } as any);
      const withRiasec = await service.getAvailableSubjects(studentId);

      expect(withoutRiasec.coreSubjects).toEqual(withRiasec.coreSubjects);
      expect(withoutRiasec.optionalSubjects).toEqual(withRiasec.optionalSubjects);
      // Only the advisory block itself is allowed to differ.
      expect(withoutRiasec.careerAdvisory).toBeNull();
      expect(withRiasec.careerAdvisory).toEqual({
        dimension: 'investigative',
        label: 'Investigative',
        description: 'x',
      });
    });
  });

  describe('decide — approve', () => {
    const requestId = 'request-uuid';

    beforeEach(() => {
      requestRepo.findOne.mockResolvedValue({
        id: requestId,
        studentId,
        windowId,
        streamId: null,
        status: SubjectSelectionStatus.PENDING,
      } as any);
      itemRepo.find.mockResolvedValue([
        { requestId, subjectId: 'core-1', selectionType: SubjectSelectionType.CORE } as any,
        { requestId, subjectId: 's1', selectionType: SubjectSelectionType.OPTIONAL } as any,
      ]);
    });

    it('upserts an enrollment row per item, notifies the student and every guardian, and audit-logs the approval', async () => {
      await service.decide(requestId, SubjectSelectionStatus.APPROVED, 'principal-staff-id');

      expect(em.query).toHaveBeenCalledTimes(2); // one upsert per item, no stream update (streamId null)
      expect(notificationService.createForStudent).toHaveBeenCalledWith(
        studentId,
        expect.stringContaining('Approved'),
        expect.any(String),
        'subject_selection_decision',
      );
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-uuid',
        expect.stringContaining('Approved'),
        expect.any(String),
        'subject_selection_decision',
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'principal-staff-id',
          action: 'approve',
          targetType: 'subject_selection',
          targetId: requestId,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'subjectSelection.approved',
        expect.objectContaining({ requestId, studentId }),
      );
    });

    it('also updates the student\'s stream when the request included one', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: requestId,
        studentId,
        windowId,
        streamId: 2,
        status: SubjectSelectionStatus.PENDING,
      } as any);

      await service.decide(requestId, SubjectSelectionStatus.APPROVED, 'principal-staff-id');

      expect(em.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "student" SET "streamId"'),
        [2, studentId],
      );
    });

    it('throws 400 when the request has already been decided', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: requestId,
        status: SubjectSelectionStatus.APPROVED,
      } as any);

      await expect(
        service.decide(requestId, SubjectSelectionStatus.APPROVED, 'staff-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('decide — reject', () => {
    const requestId = 'request-uuid';

    beforeEach(() => {
      requestRepo.findOne.mockResolvedValue({
        id: requestId,
        studentId,
        windowId,
        streamId: null,
        status: SubjectSelectionStatus.PENDING,
      } as any);
    });

    it('requires a reason — throws 400 with no reviewNote', async () => {
      await expect(
        service.decide(requestId, SubjectSelectionStatus.REJECTED, 'staff-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejecting with a reason creates no enrollment rows, only a notification', async () => {
      await service.decide(requestId, SubjectSelectionStatus.REJECTED, 'staff-id', 'Missing a core prerequisite.');

      expect(em.query).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(notificationService.createForStudent).toHaveBeenCalledWith(
        studentId,
        expect.stringContaining('Rejected'),
        expect.stringContaining('Missing a core prerequisite.'),
        'subject_selection_decision',
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
