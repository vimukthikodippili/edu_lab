import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PromotionRecommendationService } from './promotion-recommendation.service';
import { PromotionRecommendationEntity, PromotionRecommendationOutcome } from '../entities/promotion-recommendation.entity';
import { StudentEntity, StudentStatus } from '../entities/student.entity';
import { ClassSectionEntity } from '../entities/class-section.entity';

describe('PromotionRecommendationService', () => {
  let service: PromotionRecommendationService;
  let recommendationRepo: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let studentRepo: { findOne: jest.Mock };
  let classSectionRepo: { findOne: jest.Mock; find: jest.Mock };

  const student = {
    id: 'student-1',
    classSectionId: 10,
    academicYear: '2026',
  } as StudentEntity;

  beforeEach(async () => {
    recommendationRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (r) => r),
      create: jest.fn((d) => d),
    };
    studentRepo = { findOne: jest.fn() };
    classSectionRepo = { findOne: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionRecommendationService,
        { provide: getRepositoryToken(PromotionRecommendationEntity), useValue: recommendationRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
      ],
    }).compile();

    service = module.get(PromotionRecommendationService);
  });

  describe('submit', () => {
    const dto = {
      studentId: 'student-1',
      academicYear: '2026',
      outcome: PromotionRecommendationOutcome.PROMOTE,
      comment: 'Great progress this year.',
    };

    it('creates a new recommendation when the caller heads the student’s current section', async () => {
      studentRepo.findOne.mockResolvedValue(student);
      classSectionRepo.findOne.mockResolvedValue({ id: 10, classTeacherStaffId: 'staff-1' } as ClassSectionEntity);
      recommendationRepo.findOne.mockResolvedValue(null);

      const result = await service.submit('staff-1', dto);

      expect(recommendationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 'student-1', recommendedById: 'staff-1', classSectionId: 10 }),
      );
      expect(result).toEqual(expect.objectContaining({ recommendedById: 'staff-1' }));
    });

    it('updates an existing recommendation for the same student+year instead of duplicating it', async () => {
      studentRepo.findOne.mockResolvedValue(student);
      classSectionRepo.findOne.mockResolvedValue({ id: 10, classTeacherStaffId: 'staff-1' } as ClassSectionEntity);
      const existing = {
        id: 'rec-1',
        studentId: 'student-1',
        academicYear: '2026',
        outcome: PromotionRecommendationOutcome.REPEAT,
        comment: null,
      } as PromotionRecommendationEntity;
      recommendationRepo.findOne.mockResolvedValue(existing);

      const result = await service.submit('staff-1', dto);

      expect(recommendationRepo.create).not.toHaveBeenCalled();
      expect(result.outcome).toBe(PromotionRecommendationOutcome.PROMOTE);
      expect(result.comment).toBe('Great progress this year.');
    });

    it('rejects a caller who is not the class teacher of the section the student is currently in', async () => {
      studentRepo.findOne.mockResolvedValue(student);
      classSectionRepo.findOne.mockResolvedValue(null); // no section headed by this staffId matches

      await expect(service.submit('someone-else', dto)).rejects.toBeInstanceOf(ForbiddenException);
      expect(recommendationRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a recommendation for a student that does not exist', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(service.submit('staff-1', dto)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findMine', () => {
    it("returns only recommendations for sections the caller currently heads", async () => {
      classSectionRepo.find.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      recommendationRepo.find.mockResolvedValue([{ id: 'rec-1' }]);

      const result = await service.findMine('staff-1', '2026');

      expect(classSectionRepo.find).toHaveBeenCalledWith({ where: { classTeacherStaffId: 'staff-1' } });
      expect(result).toEqual([{ id: 'rec-1' }]);
    });

    it('returns an empty array when the caller heads no sections', async () => {
      classSectionRepo.find.mockResolvedValue([]);

      const result = await service.findMine('staff-1', '2026');

      expect(result).toEqual([]);
      expect(recommendationRepo.find).not.toHaveBeenCalled();
    });
  });
});
