import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ConsentResponseService } from './consent-response.service';
import { ConsentFormService, TargetPair } from './consent-form.service';
import { ConsentFormEntity, ConsentTargetType } from './entities/consent-form.entity';
import { ConsentResponseEntity, ConsentResponseType } from './entities/consent-response.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'generated', ...(d as object) })),
  create: jest.fn((d: unknown) => d),
});

const GUARDIAN_ID = 'guardian-1';
const OTHER_GUARDIAN_ID = 'guardian-2';
const STUDENT_ID = 'student-1';
const FORM_ID = 'form-1';

function buildForm(overrides: Partial<ConsentFormEntity> = {}): ConsentFormEntity {
  return {
    id: FORM_ID,
    title: 'Field Trip Consent',
    description: 'Grade 8 trip',
    targetType: ConsentTargetType.SPECIFIC_STUDENTS,
    targetGrades: null,
    targetStudentIds: [STUDENT_ID],
    deadline: '2099-01-01',
    createdByStaffId: 'staff-1',
    createdAt: new Date(),
    ...overrides,
  } as ConsentFormEntity;
}

describe('ConsentResponseService', () => {
  let service: ConsentResponseService;
  let formRepo: MockRepo<ConsentFormEntity>;
  let responseRepo: MockRepo<ConsentResponseEntity>;
  let studentGuardianRepo: MockRepo<StudentGuardianEntity>;
  let consentFormService: { resolveTargetPairs: jest.Mock };

  beforeEach(async () => {
    formRepo = repoMock<ConsentFormEntity>();
    responseRepo = repoMock<ConsentResponseEntity>();
    studentGuardianRepo = repoMock<StudentGuardianEntity>();
    consentFormService = { resolveTargetPairs: jest.fn().mockResolvedValue([]) };

    (formRepo.findOne as jest.Mock).mockResolvedValue(buildForm());
    (studentGuardianRepo.findOne as jest.Mock).mockResolvedValue({
      studentId: STUDENT_ID,
      guardianId: GUARDIAN_ID,
      isPrimaryContact: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentResponseService,
        { provide: getRepositoryToken(ConsentFormEntity), useValue: formRepo },
        { provide: getRepositoryToken(ConsentResponseEntity), useValue: responseRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: studentGuardianRepo },
        { provide: ConsentFormService, useValue: consentFormService },
      ],
    }).compile();

    service = module.get(ConsentResponseService);
  });

  describe('respond — duplicate response prevention (AI-prompt-requested test)', () => {
    it('creates the response with the given IP address and timestamp', async () => {
      (responseRepo.findOne as jest.Mock).mockResolvedValue(null);

      const response = await service.respond(
        FORM_ID,
        { studentId: STUDENT_ID, response: ConsentResponseType.SIGNED },
        GUARDIAN_ID,
        '203.0.113.5',
      );

      expect(response).toEqual(
        expect.objectContaining({
          consentFormId: FORM_ID,
          guardianId: GUARDIAN_ID,
          studentId: STUDENT_ID,
          response: ConsentResponseType.SIGNED,
          ipAddress: '203.0.113.5',
          respondedAt: expect.any(Date),
        }),
      );
    });

    it('409s a second response for the same (form, student) already recorded', async () => {
      (responseRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'existing',
        consentFormId: FORM_ID,
        studentId: STUDENT_ID,
        guardianId: GUARDIAN_ID,
        response: ConsentResponseType.SIGNED,
      });

      await expect(
        service.respond(FORM_ID, { studentId: STUDENT_ID, response: ConsentResponseType.DECLINED }, OTHER_GUARDIAN_ID, null),
      ).rejects.toThrow(ConflictException);
      expect(responseRepo.save).not.toHaveBeenCalled();
    });

    it('409s regardless of which guardian attempts the second response', async () => {
      (responseRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'existing',
        consentFormId: FORM_ID,
        studentId: STUDENT_ID,
        guardianId: OTHER_GUARDIAN_ID,
        response: ConsentResponseType.DECLINED,
      });
      (studentGuardianRepo.findOne as jest.Mock).mockResolvedValue({
        studentId: STUDENT_ID,
        guardianId: GUARDIAN_ID,
        isPrimaryContact: false,
      });

      await expect(
        service.respond(FORM_ID, { studentId: STUDENT_ID, response: ConsentResponseType.SIGNED }, GUARDIAN_ID, null),
      ).rejects.toThrow(ConflictException);
    });

    it('converts a raw DB unique-violation race into a clean 409', async () => {
      (responseRepo.findOne as jest.Mock).mockResolvedValue(null);
      (responseRepo.save as jest.Mock).mockRejectedValue({ code: '23505' });

      await expect(
        service.respond(FORM_ID, { studentId: STUDENT_ID, response: ConsentResponseType.SIGNED }, GUARDIAN_ID, null),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('respond — ownership', () => {
    it('rejects responding on behalf of a student the guardian is not linked to', async () => {
      (studentGuardianRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.respond(FORM_ID, { studentId: STUDENT_ID, response: ConsentResponseType.SIGNED }, GUARDIAN_ID, null),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for an unknown form id', async () => {
      (formRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.respond('missing', { studentId: STUDENT_ID, response: ConsentResponseType.SIGNED }, GUARDIAN_ID, null),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listPendingForGuardian — intersection with live-resolved targets', () => {
    it('returns one row per (form, own child) pair with no response yet', async () => {
      const guardian = { id: GUARDIAN_ID } as GuardianEntity;
      const student = { id: STUDENT_ID } as StudentEntity;
      const pairs: TargetPair[] = [{ student, guardians: [guardian] }];

      const form = buildForm();
      (studentGuardianRepo.find as jest.Mock).mockResolvedValue([
        { studentId: STUDENT_ID, guardianId: GUARDIAN_ID, isPrimaryContact: true },
      ]);
      (formRepo.find as jest.Mock).mockResolvedValue([form]);
      consentFormService.resolveTargetPairs.mockResolvedValue(pairs);
      (responseRepo.find as jest.Mock).mockResolvedValue([]);

      const rows = await service.listPendingForGuardian(GUARDIAN_ID);

      expect(rows).toEqual([{ form, studentId: STUDENT_ID }]);
    });

    it('excludes forms not targeting any of the guardian own children', async () => {
      (studentGuardianRepo.find as jest.Mock).mockResolvedValue([
        { studentId: STUDENT_ID, guardianId: GUARDIAN_ID, isPrimaryContact: true },
      ]);
      (formRepo.find as jest.Mock).mockResolvedValue([buildForm()]);
      consentFormService.resolveTargetPairs.mockResolvedValue([
        { student: { id: 'someone-elses-child' } as StudentEntity, guardians: [] },
      ]);

      const rows = await service.listPendingForGuardian(GUARDIAN_ID);

      expect(rows).toHaveLength(0);
    });

    it('excludes a child that already has a response recorded', async () => {
      const guardian = { id: GUARDIAN_ID } as GuardianEntity;
      const student = { id: STUDENT_ID } as StudentEntity;
      (studentGuardianRepo.find as jest.Mock).mockResolvedValue([
        { studentId: STUDENT_ID, guardianId: GUARDIAN_ID, isPrimaryContact: true },
      ]);
      (formRepo.find as jest.Mock).mockResolvedValue([buildForm()]);
      consentFormService.resolveTargetPairs.mockResolvedValue([{ student, guardians: [guardian] }]);
      (responseRepo.find as jest.Mock).mockResolvedValue([
        {
          id: 'resp-1',
          consentFormId: FORM_ID,
          guardianId: GUARDIAN_ID,
          studentId: STUDENT_ID,
          response: ConsentResponseType.SIGNED,
          reason: null,
          respondedAt: new Date(),
          ipAddress: null,
        },
      ]);

      const rows = await service.listPendingForGuardian(GUARDIAN_ID);

      expect(rows).toHaveLength(0);
    });

    it('returns nothing for a guardian with no linked children', async () => {
      (studentGuardianRepo.find as jest.Mock).mockResolvedValue([]);
      const rows = await service.listPendingForGuardian(GUARDIAN_ID);
      expect(rows).toEqual([]);
      expect(formRepo.find).not.toHaveBeenCalled();
    });
  });
});
