import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SubjectsService } from './subjects.service';
import { SubjectCategoryEntity } from './entities/subject-category.entity';
import { SubjectEntity } from './entities/subject.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((data: Partial<T>) => data as T),
  createQueryBuilder: jest.fn(),
  count: jest.fn(),
});

const makeCategory = (overrides: Partial<SubjectCategoryEntity> = {}): SubjectCategoryEntity =>
  ({
    id: 1,
    name: 'Core',
    description: null,
    color: '#0d6efd',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SubjectCategoryEntity);

const makeSubject = (overrides: Partial<SubjectEntity> = {}): SubjectEntity =>
  ({
    id: 'subject-uuid-001',
    code: 'MAT',
    name: 'Mathematics',
    description: null,
    categoryId: 1,
    category: makeCategory(),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SubjectEntity);

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('SubjectsService', () => {
  let service: SubjectsService;
  let categoryRepo: jest.Mocked<Repository<SubjectCategoryEntity>>;
  let subjectRepo: jest.Mocked<Repository<SubjectEntity>>;

  const buildService = async () => {
    categoryRepo = repoMock<SubjectCategoryEntity>() as any;
    subjectRepo = repoMock<SubjectEntity>() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectsService,
        { provide: getRepositoryToken(SubjectCategoryEntity), useValue: categoryRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
      ],
    }).compile();

    service = module.get(SubjectsService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildService();
  });

  // ─── Subject Categories ──────────────────────────────────────────────────────

  describe('Subject Categories', () => {
    it('createCategory — throws 409 on duplicate name (case-insensitive)', async () => {
      const existing = makeCategory({ name: 'core' });
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
      };
      categoryRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.createCategory({ name: 'Core', color: '#0d6efd' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('deactivateCategory — throws 422 when active subjects exist in category', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);
      subjectRepo.count.mockResolvedValue(3);

      await expect(service.deactivateCategory(1)).rejects.toThrow(UnprocessableEntityException);
    });

    it('deactivateCategory — succeeds when category has no active subjects', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);
      subjectRepo.count.mockResolvedValue(0);
      categoryRepo.save.mockResolvedValue({ ...category, isActive: false } as any);

      const result = await service.deactivateCategory(1);
      expect(result.isActive).toBe(false);
      expect(categoryRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('reactivateCategory — sets isActive=true', async () => {
      const category = makeCategory({ isActive: false });
      categoryRepo.findOne.mockResolvedValue(category);
      categoryRepo.save.mockResolvedValue({ ...category, isActive: true } as any);

      const result = await service.reactivateCategory(1);
      expect(result.isActive).toBe(true);
    });
  });

  // ─── create — subject validation ────────────────────────────────────────────

  describe('create — subject validation', () => {
    it('throws 422 when categoryId does not exist', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ code: 'SCI', name: 'Science', categoryId: 999 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 409 on duplicate code (case-insensitive)', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);

      const existing = makeSubject({ code: 'mat' });
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existing),
      };
      subjectRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.create({ code: 'MAT', name: 'Mathematics', categoryId: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('saves subject with correct categoryId', async () => {
      const category = makeCategory();
      categoryRepo.findOne.mockResolvedValue(category);

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // no duplicate
      };
      subjectRepo.createQueryBuilder.mockReturnValue(qb);

      const saved = makeSubject({ code: 'MAT', categoryId: 1 });
      subjectRepo.save.mockResolvedValue(saved);

      const result = await service.create({ code: 'MAT', name: 'Mathematics', categoryId: 1 });
      expect(result.categoryId).toBe(1);
      expect(subjectRepo.save).toHaveBeenCalled();
    });
  });

  // ─── findMany — filters ──────────────────────────────────────────────────────

  describe('findMany — filters', () => {
    const makeQb = (results: SubjectEntity[], total = results.length) => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([results, total]),
      };
      return qb;
    };

    it('returns only active subjects by default', async () => {
      const active = makeSubject({ isActive: true });
      const qb = makeQb([active]);
      subjectRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMany({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('s.isActive = true');
    });

    it('returns all subjects when includeInactive=true', async () => {
      const activeSubj = makeSubject({ isActive: true });
      const inactiveSubj = makeSubject({ id: 'uuid-002', isActive: false, code: 'OLD' });
      const qb = makeQb([activeSubj, inactiveSubj], 2);
      subjectRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMany({ page: 1, limit: 20, includeInactive: true });
      expect(result.data).toHaveLength(2);
      // When includeInactive=true, the WHERE s.isActive = true clause is NOT applied
      expect(qb.where).not.toHaveBeenCalledWith('s.isActive = true');
    });

    it('applies ILIKE search across name and code', async () => {
      const qb = makeQb([makeSubject()]);
      subjectRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findMany({ page: 1, limit: 20, search: 'math' });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(s.name ILIKE :q OR s.code ILIKE :q)',
        { q: '%math%' },
      );
    });
  });

  // ─── findById — historical reference ─────────────────────────────────────────

  describe('findById — historical reference', () => {
    it('resolves a deactivated subject by ID (isActive=false, still found)', async () => {
      const deactivated = makeSubject({ isActive: false, code: 'OLD' });
      subjectRepo.findOne.mockResolvedValue(deactivated);

      const result = await service.findById('subject-uuid-001');
      expect(result.isActive).toBe(false);
      expect(result.code).toBe('OLD');
    });

    it('throws 404 for truly non-existent subject ID', async () => {
      subjectRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
