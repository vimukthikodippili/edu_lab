import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SyllabusService } from './syllabus.service';
import { SyllabusUnitEntity } from './entities/syllabus-unit.entity';

const makeUnit = (overrides: Partial<SyllabusUnitEntity> = {}): SyllabusUnitEntity =>
  ({
    id: 'unit-uuid-' + (overrides.order ?? 1),
    subjectId: 'sub-uuid',
    gradeId: 10,
    title: `Lesson ${overrides.order ?? 1}`,
    description: null,
    order: overrides.order ?? 1,
    academicYear: '2025',
    subject: {} as never,
    grade: {} as never,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SyllabusUnitEntity);

const SOURCE_UNITS = [
  makeUnit({ order: 1, title: 'Lesson 1' }),
  makeUnit({ order: 2, title: 'Lesson 2' }),
  makeUnit({ order: 3, title: 'Lesson 3' }),
];

describe('SyllabusService', () => {
  let service: SyllabusService;
  let mockRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    findBy: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findBy: jest.fn(),
      count: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (entity) => (Array.isArray(entity) ? entity : { id: 'new-uuid', ...entity })),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyllabusService,
        { provide: getRepositoryToken(SyllabusUnitEntity), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SyllabusService>(SyllabusService);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // copyFromYear
  // ──────────────────────────────────────────────────────────────────────────

  describe('copyFromYear', () => {
    const dto = { subjectId: 'sub-uuid', gradeId: 10, sourceYear: '2025', targetYear: '2026' };

    it('duplicates source year units into the target year', async () => {
      mockRepo.find.mockResolvedValue(SOURCE_UNITS);
      mockRepo.count.mockResolvedValue(0);
      mockRepo.save.mockImplementation(async (copies: SyllabusUnitEntity[]) =>
        copies.map((c, i) => ({ ...c, id: `new-${i}` })),
      );

      const result = await service.copyFromYear(dto);

      expect(result).toHaveLength(3);
      result.forEach((u, i) => {
        expect(u.title).toBe(SOURCE_UNITS[i].title);
        expect(u.order).toBe(SOURCE_UNITS[i].order);
        expect(u.academicYear).toBe('2026');
      });
    });

    it('does NOT mutate the original source units', async () => {
      mockRepo.find.mockResolvedValue(SOURCE_UNITS);
      mockRepo.count.mockResolvedValue(0);
      mockRepo.save.mockResolvedValue([]);

      await service.copyFromYear(dto);

      // Original source units still have '2025'
      SOURCE_UNITS.forEach((u) => {
        expect(u.academicYear).toBe('2025');
      });
    });

    it('returned units have the targetYear', async () => {
      mockRepo.find.mockResolvedValue(SOURCE_UNITS);
      mockRepo.count.mockResolvedValue(0);
      mockRepo.create.mockImplementation((dto) => ({ ...dto }));
      mockRepo.save.mockImplementation(async (copies: SyllabusUnitEntity[]) => copies);

      const result = await service.copyFromYear(dto);

      result.forEach((u) => expect(u.academicYear).toBe('2026'));
    });

    it('throws NotFoundException when source year has no units', async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(service.copyFromYear(dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when target year already has units', async () => {
      mockRepo.find.mockResolvedValue(SOURCE_UNITS);
      mockRepo.count.mockResolvedValue(3);

      await expect(service.copyFromYear(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // remove
  // ──────────────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when unit does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-uuid')).rejects.toThrow(NotFoundException);
    });

    it('removes the unit when found', async () => {
      const unit = makeUnit();
      mockRepo.findOne.mockResolvedValue(unit);
      mockRepo.remove.mockResolvedValue(unit);

      await expect(service.remove(unit.id)).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(unit);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // update
  // ──────────────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when unit does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.update('bad-id', { title: 'New Title' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
