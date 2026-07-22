import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { EquipmentCategoryService } from './equipment-category.service';
import { EquipmentCategoryEntity } from './entities/equipment-category.entity';
import { EquipmentEntity } from './entities/equipment.entity';
import { LabTypeEntity } from '../labs/entities/lab-type.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  delete: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
});

const LAB_TYPE_ID = 'lab-type-uuid';
const CATEGORY_ID = 'category-uuid';

describe('EquipmentCategoryService', () => {
  let service: EquipmentCategoryService;
  let categoryRepo: MockRepo<EquipmentCategoryEntity>;
  let labTypeRepo: MockRepo<LabTypeEntity>;
  let equipmentRepo: MockRepo<EquipmentEntity>;

  beforeEach(async () => {
    categoryRepo = repoMock<EquipmentCategoryEntity>();
    labTypeRepo = repoMock<LabTypeEntity>();
    equipmentRepo = repoMock<EquipmentEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentCategoryService,
        { provide: getRepositoryToken(EquipmentCategoryEntity), useValue: categoryRepo },
        { provide: getRepositoryToken(LabTypeEntity), useValue: labTypeRepo },
        { provide: getRepositoryToken(EquipmentEntity), useValue: equipmentRepo },
      ],
    }).compile();

    service = module.get<EquipmentCategoryService>(EquipmentCategoryService);
    jest.clearAllMocks();
    labTypeRepo.findOne!.mockResolvedValue({ id: LAB_TYPE_ID, name: 'Science' });
  });

  describe('create', () => {
    it('creates a category when the lab type exists', async () => {
      const result = await service.create({ labTypeId: LAB_TYPE_ID, name: 'Glassware' });

      expect(categoryRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('rejects an unknown labTypeId — 422', async () => {
      labTypeRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.create({ labTypeId: 'bogus', name: 'Glassware' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('update', () => {
    it('renames a category', async () => {
      categoryRepo.findOne!.mockResolvedValue({ id: CATEGORY_ID, labTypeId: LAB_TYPE_ID, name: 'Glassware' });

      const result = await service.update(CATEGORY_ID, { name: 'Lab Glassware' });

      expect(result.name).toBe('Lab Glassware');
    });

    it('throws NotFoundException for an unknown category', async () => {
      categoryRepo.findOne!.mockResolvedValue(undefined);

      await expect(service.update(CATEGORY_ID, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes a category not referenced by any equipment', async () => {
      categoryRepo.findOne!.mockResolvedValue({ id: CATEGORY_ID, labTypeId: LAB_TYPE_ID, name: 'Glassware' });
      equipmentRepo.count!.mockResolvedValue(0);

      await service.delete(CATEGORY_ID);

      expect(categoryRepo.delete).toHaveBeenCalledWith(CATEGORY_ID);
    });

    it('throws ConflictException (409) when equipment still references the category', async () => {
      categoryRepo.findOne!.mockResolvedValue({ id: CATEGORY_ID, labTypeId: LAB_TYPE_ID, name: 'Glassware' });
      equipmentRepo.count!.mockResolvedValue(3);

      await expect(service.delete(CATEGORY_ID)).rejects.toThrow(ConflictException);
      expect(categoryRepo.delete).not.toHaveBeenCalled();
    });
  });
});
