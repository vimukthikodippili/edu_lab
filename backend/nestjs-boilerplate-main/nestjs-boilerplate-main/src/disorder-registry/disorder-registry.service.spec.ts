import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { DisorderRegistryService } from './disorder-registry.service';
import {
  DisorderRegistryEntity,
  DisorderSection,
  RiskCategory,
} from './entities/disorder-registry.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const DEPRESSION: DisorderRegistryEntity = {
  id: 'domain-depression',
  code: 'MHA-DOM-06',
  name: 'Depression',
  section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
  riskCategory: RiskCategory.EMOTIONAL_RISK,
  ageMin: 12,
  ageMax: 19,
  symptoms: ['persistent sadness'],
  tests: ['DASS-21', 'PHQ-A (Adolescent Depression)'],
  safetyFlag: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ANXIETY: DisorderRegistryEntity = {
  id: 'domain-anxiety',
  code: 'MHA-DOM-07',
  name: 'Anxiety',
  section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
  riskCategory: RiskCategory.EMOTIONAL_RISK,
  ageMin: 9,
  ageMax: 19,
  symptoms: ['excessive worry'],
  tests: ['DASS-21 Anxiety Scale', 'GAD-7'],
  safetyFlag: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DisorderRegistryService', () => {
  let service: DisorderRegistryService;
  let repo: MockRepo<DisorderRegistryEntity>;

  beforeEach(async () => {
    repo = repoMock<DisorderRegistryEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisorderRegistryService,
        { provide: getRepositoryToken(DisorderRegistryEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<DisorderRegistryService>(DisorderRegistryService);
  });

  describe('findAll', () => {
    it('returns every domain when activeOnly is false (default)', async () => {
      repo.find!.mockResolvedValue([DEPRESSION, ANXIETY]);
      const result = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
      expect(result).toHaveLength(2);
    });

    it('filters to isActive:true when activeOnly is true', async () => {
      repo.find!.mockResolvedValue([ANXIETY]);
      await service.findAll(true);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });

  describe('deactivating a domain (explicitly-requested test)', () => {
    it('excludes it from the active-only query, but never deletes it — still returned by findAll(false) and findById', async () => {
      repo.findOne!.mockResolvedValue({ ...DEPRESSION });

      // Deactivate.
      await service.update(DEPRESSION.id, { isActive: false });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));

      // Active-only query no longer includes it (simulated: the repo now only returns the
      // still-active domain when isActive:true is requested).
      repo.find!.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(where?.isActive === true ? [ANXIETY] : [{ ...DEPRESSION, isActive: false }, ANXIETY]),
      );
      const activeOnly = await service.findAll(true);
      expect(activeOnly.find((d) => d.id === DEPRESSION.id)).toBeUndefined();

      // Unfiltered query and direct lookup both still return the row — no cascade-delete.
      const all = await service.findAll(false);
      expect(all.find((d) => d.id === DEPRESSION.id)).toBeDefined();

      repo.findOne!.mockResolvedValue({ ...DEPRESSION, isActive: false });
      const stillFindable = await service.findById(DEPRESSION.id);
      expect(stillFindable.id).toBe(DEPRESSION.id);
    });
  });

  describe('create', () => {
    it('creates a new domain', async () => {
      repo.findOne!.mockResolvedValue(undefined);
      await service.create({
        code: 'MHA-DOM-99',
        name: 'Test Domain',
        section: DisorderSection.SOCIAL_PROBLEMS,
        riskCategory: RiskCategory.SOCIAL_RISK,
        ageMin: 10,
        ageMax: 15,
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'MHA-DOM-99', symptoms: [], tests: [], safetyFlag: false }),
      );
    });

    it('rejects a duplicate code with 409', async () => {
      repo.findOne!.mockResolvedValue(DEPRESSION);
      await expect(
        service.create({
          code: DEPRESSION.code,
          name: 'Duplicate',
          section: DisorderSection.EMOTIONAL_MENTAL_HEALTH,
          riskCategory: RiskCategory.EMOTIONAL_RISK,
          ageMin: 10,
          ageMax: 15,
        }),
      ).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects ageMax < ageMin with 422', async () => {
      repo.findOne!.mockResolvedValue(undefined);
      await expect(
        service.create({
          code: 'MHA-DOM-98',
          name: 'Bad Range',
          section: DisorderSection.SOCIAL_PROBLEMS,
          riskCategory: RiskCategory.SOCIAL_RISK,
          ageMin: 15,
          ageMax: 10,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException for an unknown id', async () => {
      repo.findOne!.mockResolvedValue(undefined);
      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('rejects an edit that leaves ageMax < ageMin', async () => {
      repo.findOne!.mockResolvedValue({ ...ANXIETY });
      await expect(service.update(ANXIETY.id, { ageMax: 5 })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('rejects renaming to a code already used by a different domain', async () => {
      repo.findOne!
        .mockResolvedValueOnce({ ...ANXIETY }) // findById lookup
        .mockResolvedValueOnce(DEPRESSION); // code-uniqueness lookup finds a clash
      await expect(service.update(ANXIETY.id, { code: DEPRESSION.code })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
