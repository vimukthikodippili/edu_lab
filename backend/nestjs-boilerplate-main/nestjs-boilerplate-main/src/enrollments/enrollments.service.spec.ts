import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EnrollmentsService } from './enrollments.service';
import { ALStreamEntity } from './entities/al-stream.entity';
import { ALStreamSubjectEntity } from './entities/al-stream-subject.entity';
import { StudentSubjectEnrollmentEntity } from './entities/student-subject-enrollment.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { StudentEntity } from '../students/entities/student.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data: Partial<T>) => data as T),
  createQueryBuilder: jest.fn(),
  count: jest.fn(),
  remove: jest.fn(),
  query: jest.fn(),
});

const makeMockDataSource = (impl?: (fn: any) => Promise<any>) => ({
  transaction: jest.fn().mockImplementation(impl ?? ((fn: any) => fn(makeEntityManager()))),
  query: jest.fn(),
});

const makeEntityManager = (overrides: Partial<any> = {}): any => ({
  createQueryBuilder: jest.fn().mockReturnValue({
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  }),
  create: jest.fn((_, data: any) => data),
  save: jest.fn().mockResolvedValue([]),
  query: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const makeStream = (overrides: Partial<ALStreamEntity> = {}): ALStreamEntity =>
  ({
    id: 1,
    name: 'Maths',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ALStreamEntity);

const makeSubject = (overrides: Partial<SubjectEntity> = {}): SubjectEntity =>
  ({
    id: 'subject-uuid-001',
    code: 'MAT',
    name: 'Mathematics',
    description: null,
    categoryId: 1,
    category: { id: 1, name: 'Core', color: '#0d6efd', isActive: true } as any,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SubjectEntity);

const makeStudent = (overrides: Partial<StudentEntity> = {}): StudentEntity =>
  ({
    id: 'student-uuid-001',
    admissionNumber: 'SIMS/2026/00001',
    firstName: 'Nimal',
    lastName: 'Perera',
    grade: { id: 1, name: '10', level: 10 } as any,
    gradeId: 1,
    streamId: null,
    stream: null,
    isActive: true,
    ...overrides,
  } as any);

const makeEnrollment = (
  overrides: Partial<StudentSubjectEnrollmentEntity> = {},
): StudentSubjectEnrollmentEntity =>
  ({
    id: 'enroll-uuid-001',
    studentId: 'student-uuid-001',
    subjectId: 'subject-uuid-001',
    subject: makeSubject(),
    enrolledAt: new Date(),
    ...overrides,
  } as StudentSubjectEnrollmentEntity);

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let streamRepo: jest.Mocked<Repository<ALStreamEntity>>;
  let streamSubjectRepo: jest.Mocked<Repository<ALStreamSubjectEntity>>;
  let enrollmentRepo: jest.Mocked<Repository<StudentSubjectEnrollmentEntity>>;
  let subjectRepo: jest.Mocked<Repository<SubjectEntity>>;
  let studentRepo: jest.Mocked<Repository<StudentEntity>>;
  let dataSource: ReturnType<typeof makeMockDataSource>;

  const buildService = async (dataSourceOverride?: any) => {
    streamRepo = repoMock<ALStreamEntity>() as any;
    streamSubjectRepo = repoMock<ALStreamSubjectEntity>() as any;
    enrollmentRepo = repoMock<StudentSubjectEnrollmentEntity>() as any;
    subjectRepo = repoMock<SubjectEntity>() as any;
    studentRepo = repoMock<StudentEntity>() as any;
    dataSource = dataSourceOverride ?? makeMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        { provide: getRepositoryToken(ALStreamEntity), useValue: streamRepo },
        { provide: getRepositoryToken(ALStreamSubjectEntity), useValue: streamSubjectRepo },
        { provide: getRepositoryToken(StudentSubjectEnrollmentEntity), useValue: enrollmentRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<EnrollmentsService>(EnrollmentsService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildService();
  });

  // ─── A/L Stream Management ────────────────────────────────────────────────────

  describe('A/L Stream management', () => {
    it('createStream — throws 409 on duplicate name (case-insensitive)', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(makeStream({ name: 'maths' })),
      };
      streamRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.createStream({ name: 'Maths' })).rejects.toThrow(ConflictException);
    });

    it('addSubjectToStream — throws 409 if subject already in stream defaults', async () => {
      streamRepo.findOne.mockResolvedValue(makeStream());
      subjectRepo.findOne.mockResolvedValue(makeSubject());
      streamSubjectRepo.findOne.mockResolvedValue({
        streamId: 1,
        subjectId: 'subject-uuid-001',
      } as any);

      await expect(service.addSubjectToStream(1, 'subject-uuid-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('removeSubjectFromStream — throws 404 if subject not in stream defaults', async () => {
      streamSubjectRepo.findOne.mockResolvedValue(null);

      await expect(service.removeSubjectFromStream(1, 'subject-uuid-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── addEnrollment ───────────────────────────────────────────────────────────

  describe('addEnrollment', () => {
    it('throws 404 for unknown student', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(service.addEnrollment('unknown-id', 'subject-uuid-001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 409 on duplicate enrollment (same subject already enrolled)', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent());
      subjectRepo.findOne.mockResolvedValue(makeSubject());
      enrollmentRepo.findOne.mockResolvedValue(makeEnrollment());

      await expect(service.addEnrollment('student-uuid-001', 'subject-uuid-001')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws 422 for inactive subject', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent());
      subjectRepo.findOne.mockResolvedValue(makeSubject({ isActive: false }));

      await expect(service.addEnrollment('student-uuid-001', 'subject-uuid-001')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  // ─── removeEnrollment ────────────────────────────────────────────────────────

  describe('removeEnrollment', () => {
    it('throws 404 for un-enrolled subject', async () => {
      enrollmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeEnrollment('student-uuid-001', 'subject-uuid-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── replaceEnrollments — isolation guarantee (AC-3) ─────────────────────────

  describe('replaceEnrollments — isolation guarantee', () => {
    it('DELETE query is scoped to the given studentId — cannot affect another student', async () => {
      const studentId = 'student-uuid-001';

      let capturedWhere: string | undefined;
      const em = makeEntityManager();
      const deleteQb: any = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation((clause: string) => {
          capturedWhere = clause;
          return deleteQb;
        }),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      em.createQueryBuilder.mockReturnValue(deleteQb);

      const ds = makeMockDataSource(async (fn: any) => fn(em));
      await buildService(ds);

      // Set mocks AFTER buildService re-creates the repos
      studentRepo.findOne.mockResolvedValue(makeStudent({ id: studentId }));
      subjectRepo.findOne.mockResolvedValue(makeSubject());
      enrollmentRepo.find.mockResolvedValue([makeEnrollment()]);

      await service.replaceEnrollments(studentId, { subjectIds: ['subject-uuid-001'] });

      // Isolation: the WHERE clause must reference studentId — never a global DELETE
      expect(capturedWhere).toContain('studentId');
    });

    it('replaces atomically within a transaction', async () => {
      const studentId = 'student-uuid-001';

      const em = makeEntityManager();
      const ds = makeMockDataSource(async (fn: any) => fn(em));
      await buildService(ds);

      // Set mocks AFTER buildService re-creates the repos
      studentRepo.findOne.mockResolvedValue(makeStudent({ id: studentId }));
      subjectRepo.findOne.mockResolvedValue(makeSubject());
      enrollmentRepo.find.mockResolvedValue([makeEnrollment()]);

      await service.replaceEnrollments(studentId, { subjectIds: ['subject-uuid-001'] });

      expect(ds.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ─── assignStream ────────────────────────────────────────────────────────────

  describe('assignStream', () => {
    it('pre-populates stream default subjects via ON CONFLICT DO NOTHING', async () => {
      const studentId = 'student-uuid-001';

      const em = makeEntityManager();
      const ds = makeMockDataSource(async (fn: any) => fn(em));
      await buildService(ds);

      // Set mocks AFTER buildService re-creates the repos
      studentRepo.findOne.mockResolvedValue(
        makeStudent({ id: studentId, grade: { id: 12, level: 12 } as any }),
      );
      streamRepo.findOne.mockResolvedValue(makeStream({ id: 2 }));
      enrollmentRepo.find.mockResolvedValue([]);

      await service.assignStream(studentId, { streamId: 2 });

      // The transaction should have executed the INSERT ... SELECT with ON CONFLICT
      const insertCall = em.query.mock.calls.find((args: string[]) =>
        String(args[0]).includes('ON CONFLICT'),
      );
      expect(insertCall).toBeDefined();
    });

    it('throws 422 for non-collegiate student', async () => {
      studentRepo.findOne.mockResolvedValue(
        makeStudent({ grade: { id: 10, level: 10 } as any }),
      );
      streamRepo.findOne.mockResolvedValue(makeStream());

      await expect(
        service.assignStream('student-uuid-001', { streamId: 1 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 for inactive stream', async () => {
      studentRepo.findOne.mockResolvedValue(
        makeStudent({ grade: { id: 12, level: 12 } as any }),
      );
      streamRepo.findOne.mockResolvedValue(makeStream({ isActive: false }));

      await expect(
        service.assignStream('student-uuid-001', { streamId: 1 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── removeStream ────────────────────────────────────────────────────────────

  describe('removeStream', () => {
    it('clears student.streamId but does NOT delete enrollment rows', async () => {
      const studentId = 'student-uuid-001';
      studentRepo.findOne.mockResolvedValue(makeStudent({ id: studentId }));
      studentRepo.query.mockResolvedValue([]);

      await service.removeStream(studentId);

      expect(studentRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('streamId'),
        [studentId],
      );
      // enrollmentRepo.remove / delete must never be called
      expect(enrollmentRepo.remove).not.toHaveBeenCalled();
    });
  });
});
