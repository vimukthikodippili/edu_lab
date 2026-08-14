import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AcademicYearsService } from './academic-years.service';
import { AcademicYearEntity, AcademicYearStatus } from '../entities/academic-year.entity';
import { AcademicTermEntity } from '../entities/academic-term.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';

describe('AcademicYearsService', () => {
  let service: AcademicYearsService;
  let academicYearRepo: { findOne: jest.Mock; save: jest.Mock; find: jest.Mock; findOneOrFail: jest.Mock };
  let classSectionRepo: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    academicYearRepo = { findOne: jest.fn(), save: jest.fn(), find: jest.fn(), findOneOrFail: jest.fn() };
    classSectionRepo = { find: jest.fn(), createQueryBuilder: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicYearsService,
        { provide: getRepositoryToken(AcademicYearEntity), useValue: academicYearRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AcademicYearsService>(AcademicYearsService);
  });

  describe('startYear', () => {
    const dto = { year: '2027', termName: 'Term 1', startDate: '2027-01-05', endDate: '2027-04-10' };

    it('rejects a year that already exists', async () => {
      academicYearRepo.findOne.mockResolvedValue({ id: 1, year: '2027' });

      await expect(service.startYear(dto)).rejects.toThrow(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('clones the latest year\'s class sections and creates the first term', async () => {
      academicYearRepo.findOne.mockResolvedValue(null);
      classSectionRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ year: '2026' }),
      });
      classSectionRepo.find.mockResolvedValue([
        { id: 1, gradeId: 1, name: 'A', academicYear: '2026' },
        { id: 2, gradeId: 1, name: 'B', academicYear: '2026' },
      ]);

      const manager = {
        create: jest.fn((_E, d) => d),
        save: jest.fn((_E, d) => Promise.resolve(d)),
        findOne: jest.fn().mockResolvedValue(null), // no duplicate target-year sections yet
      };
      dataSource.transaction.mockImplementation((fn: (m: unknown) => unknown) => fn(manager));

      const result = await service.startYear(dto);

      expect(result.sectionsCreated).toBe(2);
      expect(manager.save).toHaveBeenCalledWith(
        AcademicYearEntity,
        expect.objectContaining({ year: '2027', status: AcademicYearStatus.ACTIVE }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        ClassSectionEntity,
        expect.objectContaining({ gradeId: 1, name: 'A', academicYear: '2027' }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        AcademicTermEntity,
        expect.objectContaining({ name: 'Term 1', termNumber: 1, academicYear: '2027' }),
      );
      expect(result.term.academicYear).toBe('2027');
    });

    it('skips cloning a section that already exists in the target year', async () => {
      academicYearRepo.findOne.mockResolvedValue(null);
      classSectionRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ year: '2026' }),
      });
      classSectionRepo.find.mockResolvedValue([{ id: 1, gradeId: 1, name: 'A', academicYear: '2026' }]);

      const manager = {
        create: jest.fn((_E, d) => d),
        save: jest.fn((_E, d) => Promise.resolve(d)),
        findOne: jest.fn().mockResolvedValue({ id: 99, gradeId: 1, name: 'A', academicYear: '2027' }),
      };
      dataSource.transaction.mockImplementation((fn: (m: unknown) => unknown) => fn(manager));

      const result = await service.startYear(dto);

      expect(result.sectionsCreated).toBe(0);
    });

    it('handles no prior years existing at all (first year ever)', async () => {
      academicYearRepo.findOne.mockResolvedValue(null);
      classSectionRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(undefined),
      });

      const manager = {
        create: jest.fn((_E, d) => d),
        save: jest.fn((_E, d) => Promise.resolve(d)),
        findOne: jest.fn(),
      };
      dataSource.transaction.mockImplementation((fn: (m: unknown) => unknown) => fn(manager));

      const result = await service.startYear(dto);

      expect(result.sectionsCreated).toBe(0);
      expect(classSectionRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('endYear', () => {
    it('throws when the year does not exist', async () => {
      academicYearRepo.findOne.mockResolvedValue(null);

      await expect(service.endYear(1, 'staff-uuid')).rejects.toThrow(NotFoundException);
    });

    it('rejects ending an already-ended year', async () => {
      academicYearRepo.findOne.mockResolvedValue({
        id: 1,
        year: '2026',
        status: AcademicYearStatus.ENDED,
      });

      await expect(service.endYear(1, 'staff-uuid')).rejects.toThrow(ConflictException);
    });

    it('marks an active year as ended, stamping who and when', async () => {
      const year = { id: 1, year: '2026', status: AcademicYearStatus.ACTIVE, endedAt: null, endedById: null };
      academicYearRepo.findOne.mockResolvedValue(year);
      academicYearRepo.save.mockImplementation((y) => Promise.resolve(y));
      // Simulates a fresh re-read reflecting what was actually persisted, including the eager
      // `endedBy` relation that a plain save() of the in-memory entity wouldn't repopulate.
      academicYearRepo.findOneOrFail.mockImplementation(() =>
        Promise.resolve({
          id: 1,
          year: '2026',
          status: AcademicYearStatus.ENDED,
          endedAt: expect.any(Date),
          endedById: 'staff-uuid',
        }),
      );

      const result = await service.endYear(1, 'staff-uuid');

      expect(academicYearRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AcademicYearStatus.ENDED, endedById: 'staff-uuid' }),
      );
      expect(result.status).toBe(AcademicYearStatus.ENDED);
      expect(result.endedById).toBe('staff-uuid');
    });
  });
});
