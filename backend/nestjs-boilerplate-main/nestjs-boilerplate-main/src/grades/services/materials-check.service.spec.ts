import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { MaterialsCheckService } from './materials-check.service';
import { AssessmentMaterialsCheckEntity } from '../entities/assessment-materials-check.entity';
import { AssessmentEntity, AssessmentType } from '../entities/assessment.entity';
import { StudentEntity, StudentStatus } from '../../students/entities/student.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';

const makeAssessment = (overrides: Partial<AssessmentEntity> = {}): AssessmentEntity =>
  ({
    id: 'assessment-1',
    subjectId: 'subj-1',
    termId: 1,
    classSectionId: 10,
    title: 'Art — Colour Drawing',
    assessmentType: AssessmentType.OTHER,
    totalMarks: 20,
    requiresMaterialsCheck: true,
    ...overrides,
  } as AssessmentEntity);

const makeClassSection = (overrides: Partial<ClassSectionEntity> = {}): ClassSectionEntity =>
  ({ id: 10, name: 'A', classTeacherStaffId: 'class-teacher-1', ...overrides } as ClassSectionEntity);

describe('MaterialsCheckService', () => {
  let service: MaterialsCheckService;
  let checkRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let assessmentRepo: { findOne: jest.Mock };
  let studentRepo: { find: jest.Mock };
  let classSectionRepo: { findOne: jest.Mock };
  let requirementRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    checkRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    assessmentRepo = { findOne: jest.fn() };
    studentRepo = { find: jest.fn().mockResolvedValue([]) };
    classSectionRepo = { findOne: jest.fn() };
    requirementRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsCheckService,
        { provide: getRepositoryToken(AssessmentMaterialsCheckEntity), useValue: checkRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
      ],
    }).compile();

    service = module.get<MaterialsCheckService>(MaterialsCheckService);
  });

  describe('bulkCheck', () => {
    const dto = {
      assessmentId: 'assessment-1',
      defaultHasFullMaterials: true,
      entries: [{ studentId: 'student-1', hasFullMaterials: true }],
    };

    it('throws NotFoundException for an unknown assessment', async () => {
      assessmentRepo.findOne.mockResolvedValue(null);

      await expect(service.bulkCheck(dto, 'teacher-1', false)).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when the assessment does not require a materials check', async () => {
      assessmentRepo.findOne.mockResolvedValue(makeAssessment({ requiresMaterialsCheck: false }));

      await expect(service.bulkCheck(dto, 'teacher-1', false)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(checkRepo.save).not.toHaveBeenCalled();
    });

    it('allows the class teacher of the section to submit the check', async () => {
      assessmentRepo.findOne.mockResolvedValue(makeAssessment());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'teacher-1' }));

      await service.bulkCheck(dto, 'teacher-1', false);

      expect(checkRepo.save).toHaveBeenCalledTimes(1);
    });

    it('denies a teacher who is NOT the class teacher when one is assigned', async () => {
      assessmentRepo.findOne.mockResolvedValue(makeAssessment());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'someone-else' }));

      await expect(service.bulkCheck(dto, 'teacher-1', false)).rejects.toThrow(ForbiddenException);
      expect(checkRepo.save).not.toHaveBeenCalled();
    });

    it('falls back to any assigned subject teacher when no class teacher is set for the section', async () => {
      assessmentRepo.findOne.mockResolvedValue(makeAssessment());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: null }));
      requirementRepo.findOne.mockResolvedValue({ id: 1 });

      await service.bulkCheck(dto, 'teacher-1', false);

      expect(checkRepo.save).toHaveBeenCalledTimes(1);
    });

    it('allows a privileged caller (principal/section_head/admin) regardless of class-teacher assignment', async () => {
      assessmentRepo.findOne.mockResolvedValue(makeAssessment());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'someone-else' }));

      await service.bulkCheck(dto, 'principal-1', true);

      expect(checkRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('reports allConfirmed=true only when every active student has been confirmed with full materials', async () => {
      assessmentRepo.findOne.mockResolvedValue(makeAssessment());
      studentRepo.find.mockResolvedValue([
        { id: 'student-1', firstName: 'A', lastName: 'One', admissionNumber: 'A1' },
        { id: 'student-2', firstName: 'B', lastName: 'Two', admissionNumber: 'A2' },
      ]);
      checkRepo.find.mockResolvedValue([
        { studentId: 'student-1', hasFullMaterials: true },
        { studentId: 'student-2', hasFullMaterials: true },
      ]);

      const status = await service.getStatus('assessment-1');

      expect(status.allConfirmed).toBe(true);
      expect(status.confirmedCount).toBe(2);
      expect(status.totalStudents).toBe(2);
    });

    it('reports allConfirmed=false when a student is missing materials or unchecked', async () => {
      assessmentRepo.findOne.mockResolvedValue(makeAssessment());
      studentRepo.find.mockResolvedValue([
        { id: 'student-1', firstName: 'A', lastName: 'One', admissionNumber: 'A1' },
        { id: 'student-2', firstName: 'B', lastName: 'Two', admissionNumber: 'A2' },
      ]);
      checkRepo.find.mockResolvedValue([
        { studentId: 'student-1', hasFullMaterials: true },
        { studentId: 'student-2', hasFullMaterials: false },
      ]);

      const status = await service.getStatus('assessment-1');

      expect(status.allConfirmed).toBe(false);
      expect(status.confirmedCount).toBe(1);
    });
  });
});
