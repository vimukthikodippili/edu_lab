import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StudentPromotionService } from './student-promotion.service';
import { StudentEntity, StudentStatus } from '../entities/student.entity';
import { GradeEntity } from '../entities/grade.entity';
import { ClassSectionEntity } from '../entities/class-section.entity';
import {
  EnrollmentOutcome,
  StudentEnrollmentHistoryEntity,
} from '../entities/student-enrollment-history.entity';

const grade6 = { id: 6, level: 6, name: 'Grade 6' } as GradeEntity;
const grade7 = { id: 7, level: 7, name: 'Grade 7' } as GradeEntity;
const grade13 = { id: 13, level: 13, name: 'Grade 13' } as GradeEntity;

const sectionA6 = { id: 1, name: 'A', academicYear: '2026', gradeId: 6, grade: grade6 } as ClassSectionEntity;
const sectionA7 = { id: 2, name: 'A', academicYear: '2027', gradeId: 7, grade: grade7 } as ClassSectionEntity;

const makeStudent = (overrides: Partial<StudentEntity> = {}): StudentEntity =>
  ({
    id: 'student-uuid-1',
    firstName: 'Kasun',
    lastName: 'Bandara',
    admissionNumber: 'SIMS/2020/00001',
    status: StudentStatus.ACTIVE,
    academicYear: '2026',
    gradeId: 6,
    grade: grade6,
    classSectionId: 1,
    classSection: sectionA6,
    ...overrides,
  }) as unknown as StudentEntity;

describe('StudentPromotionService', () => {
  let service: StudentPromotionService;
  let studentRepo: { find: jest.Mock };
  let gradeRepo: { find: jest.Mock };
  let classSectionRepo: { find: jest.Mock };
  let historyRepo: Record<string, unknown>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    studentRepo = { find: jest.fn() };
    gradeRepo = { find: jest.fn() };
    classSectionRepo = { find: jest.fn() };
    historyRepo = {};
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentPromotionService,
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(GradeEntity), useValue: gradeRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(StudentEnrollmentHistoryEntity), useValue: historyRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<StudentPromotionService>(StudentPromotionService);
  });

  describe('preview', () => {
    it('returns an empty array when no active students exist for the source year', async () => {
      studentRepo.find.mockResolvedValue([]);

      const result = await service.preview({ sourceAcademicYear: '2026', targetAcademicYear: '2027' });

      expect(result).toEqual([]);
    });

    it('flags a student in the terminal grade (level 13) as graduated', async () => {
      studentRepo.find.mockResolvedValue([makeStudent({ gradeId: 13, grade: grade13, classSection: { ...sectionA6, gradeId: 13, grade: grade13 } })]);
      gradeRepo.find.mockResolvedValue([grade6, grade7, grade13]);
      classSectionRepo.find.mockResolvedValue([]);

      const result = await service.preview({ sourceAcademicYear: '2026', targetAcademicYear: '2027' });

      expect(result[0].outcome).toBe('graduated');
      expect(result[0].targetGradeId).toBeNull();
    });

    it('promotes a student when a matching-name target section exists in the next grade', async () => {
      studentRepo.find.mockResolvedValue([makeStudent()]);
      gradeRepo.find.mockResolvedValue([grade6, grade7]);
      classSectionRepo.find.mockResolvedValue([sectionA7]);

      const result = await service.preview({ sourceAcademicYear: '2026', targetAcademicYear: '2027' });

      expect(result[0].outcome).toBe('promoted');
      expect(result[0].targetGradeId).toBe(7);
      expect(result[0].targetClassSectionId).toBe(2);
    });

    it('flags needs_manual_section when the next grade has no matching-name section yet', async () => {
      studentRepo.find.mockResolvedValue([makeStudent()]);
      gradeRepo.find.mockResolvedValue([grade6, grade7]);
      classSectionRepo.find.mockResolvedValue([]); // no target sections created yet

      const result = await service.preview({ sourceAcademicYear: '2026', targetAcademicYear: '2027' });

      expect(result[0].outcome).toBe('needs_manual_section');
      expect(result[0].targetGradeId).toBe(7);
      expect(result[0].targetClassSectionId).toBeNull();
    });
  });

  describe('commit', () => {
    const runTransaction = (manager: Record<string, jest.Mock>) => {
      dataSource.transaction.mockImplementation((fn: (m: unknown) => unknown) => fn(manager));
    };

    it('rejects a WITHDRAWN outcome — must go through the dedicated withdraw action', async () => {
      const manager = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((_E, d) => d) };
      runTransaction(manager);

      await expect(
        service.commit({
          entries: [
            {
              studentId: 'student-uuid-1',
              targetAcademicYear: '2027',
              outcome: EnrollmentOutcome.WITHDRAWN,
            },
          ],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects a promoted entry missing target grade/section', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue(makeStudent()),
        save: jest.fn().mockResolvedValue(undefined),
        create: jest.fn((_E, d) => d),
      };
      runTransaction(manager);

      await expect(
        service.commit({
          entries: [
            {
              studentId: 'student-uuid-1',
              targetAcademicYear: '2027',
              outcome: EnrollmentOutcome.PROMOTED,
            },
          ],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('writes a history snapshot and updates the student on a promoted entry', async () => {
      const student = makeStudent();
      const manager = {
        findOne: jest
          .fn()
          .mockImplementationOnce(() => Promise.resolve(student)) // load student
          .mockImplementationOnce(() => Promise.resolve(sectionA7)), // load target section
        save: jest.fn().mockImplementation((_E, d) => Promise.resolve(d)),
        create: jest.fn((_E, d) => d),
      };
      runTransaction(manager);

      const [result] = await service.commit({
        entries: [
          {
            studentId: 'student-uuid-1',
            targetAcademicYear: '2027',
            outcome: EnrollmentOutcome.PROMOTED,
            targetGradeId: 7,
            targetClassSectionId: 2,
          },
        ],
      });

      // First save call is the history snapshot
      expect(manager.save).toHaveBeenNthCalledWith(
        1,
        StudentEnrollmentHistoryEntity,
        expect.objectContaining({
          studentId: 'student-uuid-1',
          academicYear: '2026',
          gradeId: 6,
          classSectionId: 1,
          outcome: EnrollmentOutcome.PROMOTED,
        }),
      );
      expect(result.gradeId).toBe(7);
      expect(result.classSectionId).toBe(2);
      expect(result.academicYear).toBe('2027');
    });

    it('sets status to GRADUATED without moving grade/section', async () => {
      const student = makeStudent();
      const manager = {
        findOne: jest.fn().mockResolvedValue(student),
        save: jest.fn().mockImplementation((_E, d) => Promise.resolve(d)),
        create: jest.fn((_E, d) => d),
      };
      runTransaction(manager);

      const [result] = await service.commit({
        entries: [
          {
            studentId: 'student-uuid-1',
            targetAcademicYear: '2027',
            outcome: EnrollmentOutcome.GRADUATED,
          },
        ],
      });

      expect(result.status).toBe(StudentStatus.GRADUATED);
      expect(result.gradeId).toBe(6);
    });

    it('throws when the referenced student is not active', async () => {
      const manager = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn(), create: jest.fn() };
      runTransaction(manager);

      await expect(
        service.commit({
          entries: [
            {
              studentId: 'student-uuid-1',
              targetAcademicYear: '2027',
              outcome: EnrollmentOutcome.GRADUATED,
            },
          ],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
