import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UnprocessableEntityException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentEntity, StudentGender, StudentStatus } from './entities/student.entity';
import { GuardianEntity, GuardianRelationship } from './entities/guardian.entity';
import { GradeEntity, GradeStage } from './entities/grade.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateStudentDto } from './dto/create-student.dto';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const mockGrade: GradeEntity = {
  id: 6,
  level: 6,
  name: 'Grade 6',
  stage: GradeStage.JUNIOR_SECONDARY,
};

const mockSection: ClassSectionEntity = {
  id: 1,
  name: 'A',
  academicYear: '2026',
  gradeId: 6,
  grade: mockGrade,
};

const mockGuardianDto = {
  firstName: 'Sunethra',
  lastName: 'Perera',
  relationship: GuardianRelationship.MOTHER,
  nic: '987654321V',
  phone: '0771234567',
};

const baseDto: CreateStudentDto = {
  firstName: 'Kasun',
  lastName: 'Bandara',
  dateOfBirth: '2012-04-15',
  gender: StudentGender.MALE,
  gradeId: 6,
  classSectionId: 1,
  guardians: [mockGuardianDto],
};

// ─── Repository factory ───────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  createQueryBuilder: jest.fn(),
  softDelete: jest.fn(),
});

// ─── DataSource / transaction mock ────────────────────────────────────────────

const makeMockDataSource = (transactionImpl: (manager: any) => Promise<any>) => ({
  transaction: jest.fn().mockImplementation(transactionImpl),
});

describe('StudentsService', () => {
  let service: StudentsService;
  let studentRepo: jest.Mocked<Repository<StudentEntity>>;
  let gradeRepo: jest.Mocked<Repository<GradeEntity>>;
  let sectionRepo: jest.Mocked<Repository<ClassSectionEntity>>;
  let fileRepo: jest.Mocked<Repository<FileEntity>>;
  let guardianRepo: jest.Mocked<Repository<GuardianEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  const buildService = async (dataSourceOverride?: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(GradeEntity), useValue: gradeRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: sectionRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: DataSource, useValue: dataSourceOverride ?? dataSource },
      ],
    }).compile();

    return module.get<StudentsService>(StudentsService);
  };

  beforeEach(() => {
    studentRepo = repoMock<StudentEntity>() as any;
    guardianRepo = repoMock<GuardianEntity>() as any;
    gradeRepo = repoMock<GradeEntity>() as any;
    sectionRepo = repoMock<ClassSectionEntity>() as any;
    fileRepo = repoMock<FileEntity>() as any;
    dataSource = { transaction: jest.fn() } as any;
  });

  // ─── Duplicate admission number rejection ────────────────────────────────────

  describe('generateAdmissionNumber (via enroll)', () => {
    it('generates SIMS/YYYY/00001 for first student of the year', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);
      fileRepo.findOne.mockResolvedValue(null);

      let capturedAdmissionNumber = '';

      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            withDeleted: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null), // No existing students
          }),
        }),
        save: jest.fn().mockImplementation((_Entity: any, entity: any) => {
          if (entity.admissionNumber) {
            capturedAdmissionNumber = entity.admissionNumber;
          }
          return Promise.resolve(entity);
        }),
        create: jest.fn().mockImplementation((_Entity: any, data: any) => data),
      };

      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);

      await service.enroll(baseDto);

      const year = new Date().getFullYear();
      expect(capturedAdmissionNumber).toBe(`SIMS/${year}/00001`);
    });

    it('increments sequence from last existing admission number', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);

      const year = new Date().getFullYear();
      let capturedAdmissionNumber = '';

      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            withDeleted: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({
              admissionNumber: `SIMS/${year}/00041`,
            }),
          }),
        }),
        save: jest.fn().mockImplementation((_Entity: any, entity: any) => {
          if (entity.admissionNumber) {
            capturedAdmissionNumber = entity.admissionNumber;
          }
          return Promise.resolve(entity);
        }),
        create: jest.fn().mockImplementation((_Entity: any, data: any) => data),
      };

      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);

      await service.enroll(baseDto);

      expect(capturedAdmissionNumber).toBe(`SIMS/${year}/00042`);
    });
  });

  // ─── Guardian required validation ────────────────────────────────────────────

  describe('enroll — guardian validation', () => {
    it('throws 422 when guardians array is empty', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);

      // No transaction needed — should throw before entering transaction
      service = await buildService({ transaction: jest.fn() });

      const dto: CreateStudentDto = { ...baseDto, guardians: [] };

      await expect(service.enroll(dto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 with correct error key when guardians is empty', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);

      service = await buildService({ transaction: jest.fn() });

      const dto: CreateStudentDto = { ...baseDto, guardians: [] };

      try {
        await service.enroll(dto);
        fail('Expected UnprocessableEntityException to be thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        const response = (err as UnprocessableEntityException).getResponse() as any;
        expect(response.errors).toHaveProperty('guardians');
      }
    });
  });

  // ─── Grade / section validation ───────────────────────────────────────────────

  describe('enroll — grade and section validation', () => {
    it('throws 422 when grade does not exist', async () => {
      gradeRepo.findOne.mockResolvedValue(null);
      service = await buildService({ transaction: jest.fn() });

      await expect(service.enroll(baseDto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when section does not belong to the grade', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(null); // Section not found for this grade

      service = await buildService({ transaction: jest.fn() });

      await expect(service.enroll(baseDto)).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
