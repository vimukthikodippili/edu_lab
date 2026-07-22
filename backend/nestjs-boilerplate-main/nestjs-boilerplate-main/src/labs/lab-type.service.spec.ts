import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { LabTypeService } from './lab-type.service';
import { LabTypeEntity } from './entities/lab-type.entity';
import { LabEntity } from './entities/lab.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  delete: jest.fn(),
});

const LAB_TYPE_ID = 'lab-type-uuid';

const makeLabType = (overrides: Partial<LabTypeEntity> = {}): LabTypeEntity =>
  ({
    id: LAB_TYPE_ID,
    name: 'Science',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as LabTypeEntity);

describe('LabTypeService', () => {
  let service: LabTypeService;
  let labTypeRepo: MockRepo<LabTypeEntity>;
  let labRepo: MockRepo<LabEntity>;

  beforeEach(async () => {
    labTypeRepo = repoMock<LabTypeEntity>();
    labRepo = repoMock<LabEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabTypeService,
        { provide: getRepositoryToken(LabTypeEntity), useValue: labTypeRepo },
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
      ],
    }).compile();

    service = module.get<LabTypeService>(LabTypeService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new lab type — e.g. admin adding Robotics', async () => {
      const result = await service.create({ name: 'Robotics' });

      expect(labTypeRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('renames an existing lab type', async () => {
      labTypeRepo.findOne!.mockResolvedValue(makeLabType());

      await service.update(LAB_TYPE_ID, { name: 'Science Lab' });

      expect(labTypeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Science Lab' }),
      );
    });

    it('throws NotFoundException for an unknown lab type', async () => {
      labTypeRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a lab type not referenced by any lab', async () => {
      labTypeRepo.findOne!.mockResolvedValue(makeLabType());
      labRepo.count!.mockResolvedValue(0);

      await service.delete(LAB_TYPE_ID);

      expect(labTypeRepo.delete).toHaveBeenCalledWith(LAB_TYPE_ID);
    });

    it('rejects deletion when a lab currently references this type — the explicitly-requested test analog', async () => {
      labTypeRepo.findOne!.mockResolvedValue(makeLabType());
      labRepo.count!.mockResolvedValue(2);

      await expect(service.delete(LAB_TYPE_ID)).rejects.toThrow(ConflictException);
      expect(labTypeRepo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown lab type', async () => {
      labTypeRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.delete('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
