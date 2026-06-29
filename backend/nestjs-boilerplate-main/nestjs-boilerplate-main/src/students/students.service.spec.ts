import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentEntity, StudentGender, StudentStatus } from './entities/student.entity';
import { GuardianEntity, GuardianRelationship } from './entities/guardian.entity';
import { StudentGuardianEntity } from './entities/student-guardian.entity';
import { GradeEntity, GradeStage } from './entities/grade.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { AddGuardianDto } from './dto/add-guardian.dto';

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

const STUDENT_ID = 'student-uuid-001';
const GUARDIAN_ID_1 = 'guardian-uuid-001';
const GUARDIAN_ID_2 = 'guardian-uuid-002';
const GUARDIAN_ID_3 = 'guardian-uuid-003';

const makeGuardian = (id: string, overrides: Partial<GuardianEntity> = {}): GuardianEntity =>
  ({
    id,
    firstName: 'Test',
    lastName: 'Guardian',
    relationship: GuardianRelationship.FATHER,
    nic: '123456789V',
    phone: '0712345678',
    email: null,
    address: null,
    biometricEnrolled: false,
    isBlacklisted: false,
    idProofFileId: null,
    idProof: null,
    studentGuardians: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as GuardianEntity);

const makeSgRecord = (
  guardianId: string,
  isPrimaryContact: boolean,
  studentId = STUDENT_ID,
): StudentGuardianEntity =>
  ({
    studentId,
    guardianId,
    isPrimaryContact,
    guardian: makeGuardian(guardianId),
  } as StudentGuardianEntity);

const makeStudent = (studentGuardians: StudentGuardianEntity[]): StudentEntity =>
  ({
    id: STUDENT_ID,
    admissionNumber: `SIMS/${new Date().getFullYear()}/00001`,
    firstName: 'Kasun',
    lastName: 'Bandara',
    dateOfBirth: new Date('2012-04-15'),
    gender: StudentGender.MALE,
    address: null,
    contactNumber: null,
    nicNumber: null,
    medicalNotes: null,
    academicYear: String(new Date().getFullYear()),
    status: StudentStatus.ACTIVE,
    qrCode: null,
    grade: mockGrade,
    gradeId: 6,
    classSection: mockSection,
    classSectionId: 1,
    photo: null,
    photoId: null,
    studentGuardians,
    guardians: studentGuardians
      .filter((sg) => !!sg.guardian)
      .map((sg) => Object.assign(sg.guardian, { isPrimaryContact: sg.isPrimaryContact })),
    deletedAt: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as StudentEntity);

// ─── Repository factory ───────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  createQueryBuilder: jest.fn(),
  softDelete: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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
  let sgRepo: jest.Mocked<Repository<StudentGuardianEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  const buildService = async (dataSourceOverride?: any) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
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
    sgRepo = repoMock<StudentGuardianEntity>() as any;
    gradeRepo = repoMock<GradeEntity>() as any;
    sectionRepo = repoMock<ClassSectionEntity>() as any;
    fileRepo = repoMock<FileEntity>() as any;
    dataSource = { transaction: jest.fn() } as any;
  });

  // ─── Admission number generation ─────────────────────────────────────────────

  describe('generateAdmissionNumber (via enroll)', () => {
    const makeEnrollManager = (lastAdmissionNumber: string | null) => ({
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          withDeleted: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(
            lastAdmissionNumber ? { admissionNumber: lastAdmissionNumber } : null,
          ),
        }),
      }),
      save: jest.fn().mockImplementation((_Entity: any, entity: any) => Promise.resolve({ ...entity, id: 'new-uuid' })),
      create: jest.fn().mockImplementation((_Entity: any, data: any) => data),
      findOne: jest.fn().mockResolvedValue(makeStudent([makeSgRecord(GUARDIAN_ID_1, true)])),
    });

    it('generates SIMS/YYYY/00001 for first student of the year', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);
      fileRepo.findOne.mockResolvedValue(null);

      let capturedAdmissionNumber = '';
      const mockManager = makeEnrollManager(null);
      mockManager.save = jest.fn().mockImplementation((_Entity: any, entity: any) => {
        if (!Array.isArray(entity) && entity.admissionNumber) {
          capturedAdmissionNumber = entity.admissionNumber;
        }
        return Promise.resolve(Array.isArray(entity) ? entity : { ...entity, id: 'new-uuid' });
      });

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
      const mockManager = makeEnrollManager(`SIMS/${year}/00041`);
      mockManager.save = jest.fn().mockImplementation((_Entity: any, entity: any) => {
        if (!Array.isArray(entity) && entity.admissionNumber) {
          capturedAdmissionNumber = entity.admissionNumber;
        }
        return Promise.resolve(Array.isArray(entity) ? entity : { ...entity, id: 'new-uuid' });
      });

      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);
      await service.enroll(baseDto);

      expect(capturedAdmissionNumber).toBe(`SIMS/${year}/00042`);
    });
  });

  // ─── Enrollment — guardian validation ────────────────────────────────────────

  describe('enroll — guardian validation', () => {
    it('throws 422 when guardians array is empty', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);
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
        fail('Expected UnprocessableEntityException');
      } catch (err) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        const response = (err as UnprocessableEntityException).getResponse() as any;
        expect(response.errors).toHaveProperty('guardians');
      }
    });

    it('throws 422 when more than one guardian has isPrimaryContact=true', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);
      service = await buildService({ transaction: jest.fn() });

      const dto: CreateStudentDto = {
        ...baseDto,
        guardians: [
          { ...mockGuardianDto, isPrimaryContact: true },
          { ...mockGuardianDto, nic: '111111111V', isPrimaryContact: true },
        ],
      };
      await expect(service.enroll(dto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('auto-sets isPrimaryContact=true on first guardian when none are marked', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(mockSection);

      let capturedJunctions: any[] = [];
      const mockManager = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            withDeleted: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(null),
          }),
        }),
        save: jest.fn().mockImplementation((_Entity: any, entity: any) => {
          if (Array.isArray(entity)) {
            capturedJunctions = entity;
          }
          return Promise.resolve(Array.isArray(entity) ? entity : { ...entity, id: 'g-uuid' });
        }),
        create: jest.fn().mockImplementation((_Entity: any, data: any) => data),
        findOne: jest.fn().mockResolvedValue(makeStudent([makeSgRecord(GUARDIAN_ID_1, true)])),
      };

      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);

      // No isPrimaryContact in the DTO — service must auto-set
      await service.enroll(baseDto);
      expect(capturedJunctions[0]?.isPrimaryContact).toBe(true);
    });
  });

  // ─── Enrollment — grade and section validation ────────────────────────────────

  describe('enroll — grade and section validation', () => {
    it('throws 422 when grade does not exist', async () => {
      gradeRepo.findOne.mockResolvedValue(null);
      service = await buildService({ transaction: jest.fn() });

      await expect(service.enroll(baseDto)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when section does not belong to the grade', async () => {
      gradeRepo.findOne.mockResolvedValue(mockGrade);
      sectionRepo.findOne.mockResolvedValue(null);
      service = await buildService({ transaction: jest.fn() });

      await expect(service.enroll(baseDto)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ─── addGuardian ──────────────────────────────────────────────────────────────

  describe('addGuardian', () => {
    const addDto: AddGuardianDto = {
      firstName: 'Nalika',
      lastName: 'Silva',
      relationship: GuardianRelationship.AUNT,
      nic: '111222333V',
      phone: '0765432198',
      isPrimaryContact: false,
    };

    it('throws 404 when student does not exist', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      service = await buildService({ transaction: jest.fn() });

      await expect(service.addGuardian('non-existent', addDto)).rejects.toThrow(NotFoundException);
    });

    it('throws 422 when student already has 5 guardians', async () => {
      const fiveJunctions = Array.from({ length: 5 }, (_, i) =>
        makeSgRecord(`g-id-${i}`, i === 0),
      );
      studentRepo.findOne.mockResolvedValue(makeStudent(fiveJunctions));
      service = await buildService({ transaction: jest.fn() });

      await expect(service.addGuardian(STUDENT_ID, addDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('adds a guardian and returns the updated student', async () => {
      const oneJunction = [makeSgRecord(GUARDIAN_ID_1, true)];
      const updatedStudent = makeStudent([
        ...oneJunction,
        makeSgRecord(GUARDIAN_ID_2, false),
      ]);

      studentRepo.findOne.mockResolvedValue(makeStudent(oneJunction));

      const mockManager = {
        save: jest.fn().mockResolvedValue({ id: GUARDIAN_ID_2 }),
        create: jest.fn().mockImplementation((_E: any, d: any) => d),
        update: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn().mockResolvedValue(updatedStudent),
      };
      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);

      const result = await service.addGuardian(STUDENT_ID, addDto);
      expect(result.studentGuardians).toHaveLength(2);
    });

    it('clears existing primary when new guardian is added as primary', async () => {
      const oneJunction = [makeSgRecord(GUARDIAN_ID_1, true)];
      studentRepo.findOne.mockResolvedValue(makeStudent(oneJunction));

      const updateSpy = jest.fn().mockResolvedValue(undefined);
      const mockManager = {
        save: jest.fn().mockResolvedValue({ id: GUARDIAN_ID_2 }),
        create: jest.fn().mockImplementation((_E: any, d: any) => d),
        update: updateSpy,
        findOne: jest.fn().mockResolvedValue(makeStudent([
          makeSgRecord(GUARDIAN_ID_1, false),
          makeSgRecord(GUARDIAN_ID_2, true),
        ])),
      };
      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);

      await service.addGuardian(STUDENT_ID, { ...addDto, isPrimaryContact: true });

      // clearPrimaryContact should have been called
      expect(updateSpy).toHaveBeenCalledWith(
        StudentGuardianEntity,
        { studentId: STUDENT_ID, isPrimaryContact: true },
        { isPrimaryContact: false },
      );
    });
  });

  // ─── removeGuardian ───────────────────────────────────────────────────────────

  describe('removeGuardian', () => {
    it('throws 404 when student does not exist', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      service = await buildService({ transaction: jest.fn() });

      await expect(service.removeGuardian('non-existent', GUARDIAN_ID_1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 422 when trying to remove the last guardian', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent([makeSgRecord(GUARDIAN_ID_1, true)]));
      service = await buildService({ transaction: jest.fn() });

      await expect(service.removeGuardian(STUDENT_ID, GUARDIAN_ID_1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 422 when trying to remove the primary contact', async () => {
      studentRepo.findOne.mockResolvedValue(
        makeStudent([makeSgRecord(GUARDIAN_ID_1, true), makeSgRecord(GUARDIAN_ID_2, false)]),
      );
      service = await buildService({ transaction: jest.fn() });

      await expect(service.removeGuardian(STUDENT_ID, GUARDIAN_ID_1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 404 when guardian is not linked to the student', async () => {
      studentRepo.findOne.mockResolvedValue(
        makeStudent([makeSgRecord(GUARDIAN_ID_1, true), makeSgRecord(GUARDIAN_ID_2, false)]),
      );
      service = await buildService({ transaction: jest.fn() });

      await expect(service.removeGuardian(STUDENT_ID, GUARDIAN_ID_3)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removes a non-primary guardian successfully', async () => {
      const junctions = [makeSgRecord(GUARDIAN_ID_1, true), makeSgRecord(GUARDIAN_ID_2, false)];
      studentRepo.findOne.mockResolvedValue(makeStudent(junctions));

      const updatedStudent = makeStudent([makeSgRecord(GUARDIAN_ID_1, true)]);
      const mockManager = {
        delete: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn().mockResolvedValue(updatedStudent),
        create: jest.fn().mockImplementation((_E: any, d: any) => d),
      };
      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);

      const result = await service.removeGuardian(STUDENT_ID, GUARDIAN_ID_2);
      expect(result.studentGuardians).toHaveLength(1);
      expect(mockManager.delete).toHaveBeenCalledTimes(2); // junction + guardian
    });
  });

  // ─── setPrimaryContact ────────────────────────────────────────────────────────

  describe('setPrimaryContact', () => {
    it('throws 404 when student does not exist', async () => {
      studentRepo.findOne.mockResolvedValue(null);
      service = await buildService({ transaction: jest.fn() });

      await expect(service.setPrimaryContact('non-existent', GUARDIAN_ID_1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 when guardian is not linked to the student', async () => {
      studentRepo.findOne.mockResolvedValue(
        makeStudent([makeSgRecord(GUARDIAN_ID_1, true)]),
      );
      service = await buildService({ transaction: jest.fn() });

      await expect(service.setPrimaryContact(STUDENT_ID, GUARDIAN_ID_2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('correctly switches the primary contact flag', async () => {
      const junctions = [makeSgRecord(GUARDIAN_ID_1, true), makeSgRecord(GUARDIAN_ID_2, false)];
      studentRepo.findOne.mockResolvedValue(makeStudent(junctions));

      const updatedStudent = makeStudent([
        makeSgRecord(GUARDIAN_ID_1, false),
        makeSgRecord(GUARDIAN_ID_2, true),
      ]);
      const updateSpy = jest.fn().mockResolvedValue(undefined);
      const mockManager = {
        update: updateSpy,
        save: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockImplementation((_E: any, d: any) => d),
        findOne: jest.fn().mockResolvedValue(updatedStudent),
      };
      const mockDs = makeMockDataSource(async (fn) => fn(mockManager));
      service = await buildService(mockDs);

      const result = await service.setPrimaryContact(STUDENT_ID, GUARDIAN_ID_2);

      // clearPrimaryContact called first
      expect(updateSpy).toHaveBeenCalledWith(
        StudentGuardianEntity,
        { studentId: STUDENT_ID, isPrimaryContact: true },
        { isPrimaryContact: false },
      );
      // New primary is in the result
      const newPrimary = result.studentGuardians.find((sg) => sg.isPrimaryContact);
      expect(newPrimary?.guardianId).toBe(GUARDIAN_ID_2);
    });

    it('is idempotent when guardian is already the primary', async () => {
      const junctions = [makeSgRecord(GUARDIAN_ID_1, true)];
      studentRepo.findOne.mockResolvedValue(makeStudent(junctions));
      // No transaction should be started
      const txSpy = jest.fn();
      service = await buildService({ transaction: txSpy });

      const result = await service.setPrimaryContact(STUDENT_ID, GUARDIAN_ID_1);
      expect(txSpy).not.toHaveBeenCalled();
      expect(result.studentGuardians[0].isPrimaryContact).toBe(true);
    });
  });
});
