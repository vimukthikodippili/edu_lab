import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SubjectSelectionWindowService } from './subject-selection-window.service';
import { SubjectSelectionWindowEntity } from './entities/subject-selection-window.entity';
import {
  SubjectSelectionWindowCoreSubjectEntity,
  SubjectSelectionWindowOptionalSubjectEntity,
} from './entities/subject-selection-window-subject.entity';

const repoMock = <T>() => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((x: any) => Promise.resolve(x)),
  create: jest.fn((data: Partial<T>) => data as T),
  createQueryBuilder: jest.fn(),
});

const makeEntityManager = (): any => ({
  createQueryBuilder: jest.fn().mockReturnValue({
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  }),
  create: jest.fn((_, data: any) => data),
  save: jest.fn().mockResolvedValue([]),
});

const makeMockDataSource = () => ({
  transaction: jest.fn().mockImplementation((fn: any) => fn(makeEntityManager())),
});

const gradeStageId = 'grade-stage-uuid';

const makeWindow = (overrides: Partial<SubjectSelectionWindowEntity> = {}): SubjectSelectionWindowEntity =>
  ({
    id: 'window-uuid',
    gradeStageId,
    academicYear: '2026',
    openDate: new Date('2026-01-01'),
    closeDate: new Date('2026-12-31'),
    isActive: true,
    minOptionalSubjects: 1,
    maxOptionalSubjects: 3,
    requiresStreamSelection: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SubjectSelectionWindowEntity);

describe('SubjectSelectionWindowService', () => {
  let service: SubjectSelectionWindowService;
  let windowRepo: jest.Mocked<Repository<SubjectSelectionWindowEntity>>;
  let coreSubjectRepo: jest.Mocked<Repository<SubjectSelectionWindowCoreSubjectEntity>>;
  let optionalSubjectRepo: jest.Mocked<Repository<SubjectSelectionWindowOptionalSubjectEntity>>;

  beforeEach(async () => {
    windowRepo = repoMock<SubjectSelectionWindowEntity>() as any;
    coreSubjectRepo = repoMock<SubjectSelectionWindowCoreSubjectEntity>() as any;
    optionalSubjectRepo = repoMock<SubjectSelectionWindowOptionalSubjectEntity>() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectSelectionWindowService,
        { provide: getRepositoryToken(SubjectSelectionWindowEntity), useValue: windowRepo },
        { provide: getRepositoryToken(SubjectSelectionWindowCoreSubjectEntity), useValue: coreSubjectRepo },
        { provide: getRepositoryToken(SubjectSelectionWindowOptionalSubjectEntity), useValue: optionalSubjectRepo },
        { provide: DataSource, useValue: makeMockDataSource() },
      ],
    }).compile();

    service = module.get(SubjectSelectionWindowService);
  });

  describe('findById', () => {
    it('throws 404 for an unknown window', async () => {
      windowRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleActive', () => {
    it('flips isActive from true to false', async () => {
      windowRepo.findOne.mockResolvedValue(makeWindow({ isActive: true }));
      const result = await service.toggleActive('window-uuid');
      expect(result.isActive).toBe(false);
    });

    it('flips isActive from false to true', async () => {
      windowRepo.findOne.mockResolvedValue(makeWindow({ isActive: false }));
      const result = await service.toggleActive('window-uuid');
      expect(result.isActive).toBe(true);
    });
  });

  describe('create', () => {
    it('stores academicYear as a string, matching the AcademicTermEntity convention', async () => {
      const created = await service.create({
        gradeStageId,
        academicYear: 2026,
        openDate: '2026-01-01',
        closeDate: '2026-12-31',
        minOptionalSubjects: 1,
        maxOptionalSubjects: 3,
      });
      expect(created.academicYear).toBe('2026');
      expect(typeof created.academicYear).toBe('string');
    });

    it('defaults requiresStreamSelection to false when omitted', async () => {
      const created = await service.create({
        gradeStageId,
        academicYear: 2026,
        openDate: '2026-01-01',
        closeDate: '2026-12-31',
        minOptionalSubjects: 1,
        maxOptionalSubjects: 1,
      });
      expect(created.requiresStreamSelection).toBe(false);
    });
  });

  describe('findActiveWindowForGradeStage', () => {
    it('queries by gradeStageId, isActive=true, and the current-time date range', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(makeWindow()),
      };
      windowRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findActiveWindowForGradeStage(gradeStageId);

      expect(result).not.toBeNull();
      expect(qb.where).toHaveBeenCalledWith('w.gradeStageId = :gradeStageId', { gradeStageId });
      expect(qb.andWhere).toHaveBeenCalledWith('w.isActive = true');
      expect(qb.andWhere).toHaveBeenCalledWith('w.openDate <= :now', expect.any(Object));
      expect(qb.andWhere).toHaveBeenCalledWith('w.closeDate >= :now', expect.any(Object));
    });

    it('returns null when no window matches (e.g. closed or wrong stage)', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      windowRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findActiveWindowForGradeStage(gradeStageId);
      expect(result).toBeNull();
    });
  });

  describe('setCoreSubjects / setOptionalSubjects — scoped replace', () => {
    it('setCoreSubjects replaces the window core-subject list transactionally', async () => {
      windowRepo.findOne.mockResolvedValue(makeWindow());
      coreSubjectRepo.find.mockResolvedValue([
        { windowId: 'window-uuid', subjectId: 's1' } as any,
      ]);

      const result = await service.setCoreSubjects('window-uuid', { subjectIds: ['s1'] });
      expect(result).toHaveLength(1);
    });

    it('setOptionalSubjects replaces the window optional-subject pool transactionally', async () => {
      windowRepo.findOne.mockResolvedValue(makeWindow());
      optionalSubjectRepo.find.mockResolvedValue([
        { windowId: 'window-uuid', subjectId: 's2' } as any,
        { windowId: 'window-uuid', subjectId: 's3' } as any,
      ]);

      const result = await service.setOptionalSubjects('window-uuid', { subjectIds: ['s2', 's3'] });
      expect(result).toHaveLength(2);
    });
  });
});
