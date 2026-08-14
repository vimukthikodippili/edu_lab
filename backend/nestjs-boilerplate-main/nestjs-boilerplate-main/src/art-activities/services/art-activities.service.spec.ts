import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ArtActivitiesService } from './art-activities.service';
import { ArtActivityEntity } from '../entities/art-activity.entity';
import { ArtActivityStudentCheckEntity } from '../entities/art-activity-student-check.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';

const makeActivity = (overrides: Partial<ArtActivityEntity> = {}): ArtActivityEntity =>
  ({
    id: 'activity-1',
    classSectionId: 10,
    activityDate: '2026-09-01',
    title: 'Painting Activity',
    createdByStaffId: 'teacher-1',
    ...overrides,
  } as ArtActivityEntity);

const makeClassSection = (overrides: Partial<ClassSectionEntity> = {}): ClassSectionEntity =>
  ({ id: 10, name: 'A', classTeacherStaffId: 'class-teacher-1', ...overrides } as ClassSectionEntity);

describe('ArtActivitiesService', () => {
  let service: ArtActivitiesService;
  let activityRepo: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let checkRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let studentRepo: { find: jest.Mock };
  let classSectionRepo: { findOne: jest.Mock };
  let requirementRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    activityRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    checkRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    studentRepo = { find: jest.fn().mockResolvedValue([]) };
    classSectionRepo = { findOne: jest.fn() };
    requirementRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtActivitiesService,
        { provide: getRepositoryToken(ArtActivityEntity), useValue: activityRepo },
        { provide: getRepositoryToken(ArtActivityStudentCheckEntity), useValue: checkRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
      ],
    }).compile();

    service = module.get<ArtActivitiesService>(ArtActivitiesService);
  });

  describe('createActivity', () => {
    const dto = { classSectionId: 10, activityDate: '2026-09-01', title: 'Painting Activity' };

    it('throws NotFoundException for an unknown class section', async () => {
      classSectionRepo.findOne.mockResolvedValue(null);

      await expect(service.createActivity(dto, 'teacher-1', false)).rejects.toThrow(NotFoundException);
    });

    it('allows the class teacher of the section to start an activity', async () => {
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'teacher-1' }));

      await service.createActivity(dto, 'teacher-1', false);

      expect(activityRepo.save).toHaveBeenCalledTimes(1);
    });

    it('denies a teacher who is NOT the class teacher when one is assigned', async () => {
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'someone-else' }));

      await expect(service.createActivity(dto, 'teacher-1', false)).rejects.toThrow(ForbiddenException);
      expect(activityRepo.save).not.toHaveBeenCalled();
    });

    it('falls back to any assigned subject teacher when no class teacher is set', async () => {
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: null }));
      requirementRepo.findOne.mockResolvedValue({ id: 1 });

      await service.createActivity(dto, 'teacher-1', false);

      expect(activityRepo.save).toHaveBeenCalledTimes(1);
    });

    it('allows a privileged caller (principal/section_head/admin) regardless of class-teacher assignment', async () => {
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'someone-else' }));

      await service.createActivity(dto, 'principal-1', true);

      expect(activityRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('bulkPreCheck', () => {
    const dto = { entries: [{ studentId: 'student-1', hasAllColors: true }] };

    it('throws NotFoundException for an unknown activity', async () => {
      activityRepo.findOne.mockResolvedValue(null);

      await expect(service.bulkPreCheck('activity-1', dto, 'teacher-1', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('denies a teacher who is not the class teacher', async () => {
      activityRepo.findOne.mockResolvedValue(makeActivity());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'someone-else' }));

      await expect(service.bulkPreCheck('activity-1', dto, 'teacher-1', false)).rejects.toThrow(
        ForbiddenException,
      );
      expect(checkRepo.save).not.toHaveBeenCalled();
    });

    it('saves hasAllColors for each listed student when the class teacher submits', async () => {
      activityRepo.findOne.mockResolvedValue(makeActivity());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'teacher-1' }));

      const saved = await service.bulkPreCheck('activity-1', dto, 'teacher-1', false);

      expect(checkRepo.save).toHaveBeenCalledTimes(1);
      expect(saved[0]).toMatchObject({
        artActivityId: 'activity-1',
        studentId: 'student-1',
        hasAllColors: true,
        checkedByStaffId: 'teacher-1',
      });
    });
  });

  describe('bulkPostCheck', () => {
    const dto = { entries: [{ studentId: 'student-1', colorsUsed: ['red', 'blue'] }] };

    it('stores the color array for each listed student', async () => {
      activityRepo.findOne.mockResolvedValue(makeActivity());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'teacher-1' }));

      const saved = await service.bulkPostCheck('activity-1', dto, 'teacher-1', false);

      expect(saved[0]).toMatchObject({
        artActivityId: 'activity-1',
        studentId: 'student-1',
        colorsUsed: ['red', 'blue'],
      });
    });

    it('preserves an existing pre-check row rather than overwriting hasAllColors', async () => {
      activityRepo.findOne.mockResolvedValue(makeActivity());
      classSectionRepo.findOne.mockResolvedValue(makeClassSection({ classTeacherStaffId: 'teacher-1' }));
      checkRepo.find.mockResolvedValue([
        { artActivityId: 'activity-1', studentId: 'student-1', hasAllColors: true, colorsUsed: null },
      ]);

      const saved = await service.bulkPostCheck('activity-1', dto, 'teacher-1', false);

      expect(saved[0].hasAllColors).toBe(true);
      expect(saved[0].colorsUsed).toEqual(['red', 'blue']);
    });
  });

  describe('getRoster', () => {
    it('merges the section roster with existing pre/post check rows', async () => {
      activityRepo.findOne.mockResolvedValue(makeActivity());
      studentRepo.find.mockResolvedValue([
        { id: 'student-1', firstName: 'A', lastName: 'One', admissionNumber: 'A1' },
        { id: 'student-2', firstName: 'B', lastName: 'Two', admissionNumber: 'A2' },
      ]);
      checkRepo.find.mockResolvedValue([
        { studentId: 'student-1', hasAllColors: true, colorsUsed: ['red'] },
      ]);

      const result = await service.getRoster('activity-1');

      expect(result.totalStudents).toBe(2);
      expect(result.preCheckConfirmedCount).toBe(1);
      expect(result.roster.find((r) => r.studentId === 'student-1')?.colorsUsed).toEqual(['red']);
      expect(result.roster.find((r) => r.studentId === 'student-2')?.hasAllColors).toBeNull();
    });
  });
});
