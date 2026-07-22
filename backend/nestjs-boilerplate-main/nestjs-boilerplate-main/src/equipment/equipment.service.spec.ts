import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { EquipmentService } from './equipment.service';
import { EquipmentEntity } from './entities/equipment.entity';
import { EquipmentCategoryEntity } from './entities/equipment-category.entity';
import { EquipmentConditionHistoryEntity } from './entities/equipment-condition-history.entity';
import { EquipmentWriteOffEntity } from './entities/equipment-write-off.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { EquipmentStockAlertService } from './equipment-stock-alert.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
});

const LAB_ID = 'lab-uuid';
const LAB_TYPE_ID = 'lab-type-uuid';
const LAB_IN_CHARGE_ID = 'staff-lab-in-charge';
const OTHER_STAFF_ID = 'staff-other';
const CATEGORY_ID = 'category-uuid';
const EQUIPMENT_ID = 'equipment-uuid';

const makeLab = (): LabEntity =>
  ({ id: LAB_ID, name: 'Chemistry Lab 1', labTypeId: LAB_TYPE_ID, labInChargeId: LAB_IN_CHARGE_ID } as LabEntity);

const makeCategory = (overrides: Partial<EquipmentCategoryEntity> = {}): EquipmentCategoryEntity =>
  ({ id: CATEGORY_ID, labTypeId: LAB_TYPE_ID, name: 'Glassware', ...overrides } as EquipmentCategoryEntity);

const makeItem = (overrides: Partial<EquipmentEntity> = {}): EquipmentEntity =>
  ({
    id: EQUIPMENT_ID,
    labId: LAB_ID,
    name: 'Beaker 500ml',
    categoryId: CATEGORY_ID,
    quantity: 10,
    unit: 'pieces',
    condition: 'good',
    serialNumber: null,
    purchaseDate: '2026-06-01',
    minStockLevel: 5,
    lowStockNotifiedAt: null,
    ...overrides,
  } as EquipmentEntity);

describe('EquipmentService', () => {
  let service: EquipmentService;
  let equipmentRepo: MockRepo<EquipmentEntity>;
  let categoryRepo: MockRepo<EquipmentCategoryEntity>;
  let labRepo: MockRepo<LabEntity>;
  let historyRepo: MockRepo<EquipmentConditionHistoryEntity>;
  let writeOffRepo: MockRepo<EquipmentWriteOffEntity>;
  let transactionManager: { save: jest.Mock; create: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let stockAlertService: { evaluateItem: jest.Mock };

  beforeEach(async () => {
    equipmentRepo = repoMock<EquipmentEntity>();
    categoryRepo = repoMock<EquipmentCategoryEntity>();
    labRepo = repoMock<LabEntity>();
    historyRepo = repoMock<EquipmentConditionHistoryEntity>();
    writeOffRepo = repoMock<EquipmentWriteOffEntity>();
    stockAlertService = { evaluateItem: jest.fn().mockResolvedValue(false) };

    transactionManager = {
      save: jest.fn((_entityClass: unknown, data: unknown) => Promise.resolve(data)),
      create: jest.fn((_entityClass: unknown, data: unknown) => data),
    };
    dataSource = {
      transaction: jest.fn((cb: (manager: typeof transactionManager) => unknown) => cb(transactionManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: getRepositoryToken(EquipmentEntity), useValue: equipmentRepo },
        { provide: getRepositoryToken(EquipmentCategoryEntity), useValue: categoryRepo },
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
        { provide: getRepositoryToken(EquipmentConditionHistoryEntity), useValue: historyRepo },
        { provide: getRepositoryToken(EquipmentWriteOffEntity), useValue: writeOffRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: EquipmentStockAlertService, useValue: stockAlertService },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
    jest.clearAllMocks();
    labRepo.findOne!.mockResolvedValue(makeLab());
    categoryRepo.findOne!.mockResolvedValue(makeCategory());
  });

  describe('create', () => {
    it('registers equipment when the lab and category both resolve and the caller owns the lab', async () => {
      const result = await service.create(
        LAB_ID,
        { name: 'Beaker 500ml', categoryId: CATEGORY_ID, quantity: 10, unit: 'pieces', purchaseDate: '2026-06-01' },
        LAB_IN_CHARGE_ID,
        false,
      );

      expect(equipmentRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('defaults condition to "good" when omitted', async () => {
      await service.create(
        LAB_ID,
        { name: 'Beaker', categoryId: CATEGORY_ID, quantity: 1, unit: 'pieces', purchaseDate: '2026-06-01' },
        LAB_IN_CHARGE_ID,
        false,
      );

      expect(equipmentRepo.create).toHaveBeenCalledWith(expect.objectContaining({ condition: 'good' }));
    });

    it('throws NotFoundException for an unknown lab', async () => {
      labRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.create(LAB_ID, { name: 'X', categoryId: CATEGORY_ID, quantity: 1, unit: 'pieces', purchaseDate: '2026-06-01' }, LAB_IN_CHARGE_ID, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when a non-privileged, unrelated staff member tries to register equipment', async () => {
      await expect(
        service.create(LAB_ID, { name: 'X', categoryId: CATEGORY_ID, quantity: 1, unit: 'pieces', purchaseDate: '2026-06-01' }, OTHER_STAFF_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller to register equipment for any lab', async () => {
      await expect(
        service.create(LAB_ID, { name: 'X', categoryId: CATEGORY_ID, quantity: 1, unit: 'pieces', purchaseDate: '2026-06-01' }, OTHER_STAFF_ID, true),
      ).resolves.toBeDefined();
    });

    it('rejects a category that belongs to a different lab type — 422', async () => {
      categoryRepo.findOne!.mockResolvedValue(makeCategory({ labTypeId: 'other-lab-type' }));

      await expect(
        service.create(LAB_ID, { name: 'X', categoryId: CATEGORY_ID, quantity: 1, unit: 'pieces', purchaseDate: '2026-06-01' }, LAB_IN_CHARGE_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('update', () => {
    it('patches fields for the assigned Lab In-Charge', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem());

      const result = await service.update(EQUIPMENT_ID, { quantity: 20 }, LAB_IN_CHARGE_ID, false);

      expect(result.quantity).toBe(20);
    });

    it('throws ForbiddenException for a non-privileged, unrelated staff member', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem());

      await expect(service.update(EQUIPMENT_ID, { quantity: 20 }, OTHER_STAFF_ID, false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateCondition', () => {
    it('creates a history row with the correct previous/new condition and updates the item', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem({ condition: 'good' }));

      const result = await service.updateCondition(EQUIPMENT_ID, 'fair', LAB_IN_CHARGE_ID, false);

      expect(transactionManager.create).toHaveBeenCalledWith(
        EquipmentConditionHistoryEntity,
        expect.objectContaining({ previousCondition: 'good', newCondition: 'fair', changedById: LAB_IN_CHARGE_ID }),
      );
      expect(result.condition).toBe('fair');
    });

    it('is a true no-op when the new condition equals the current one — no history row', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem({ condition: 'good' }));

      await service.updateCondition(EQUIPMENT_ID, 'good', LAB_IN_CHARGE_ID, false);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for a non-privileged, unrelated staff member', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem());

      await expect(service.updateCondition(EQUIPMENT_ID, 'poor', OTHER_STAFF_ID, false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('writeOff — the explicitly-requested test', () => {
    it('reduces quantity and creates an EquipmentWriteOffEntity', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem({ quantity: 10 }));

      const result = await service.writeOff(EQUIPMENT_ID, { quantity: 3, reason: 'Broken' }, LAB_IN_CHARGE_ID, false);

      expect(result.quantity).toBe(7);
      expect(transactionManager.create).toHaveBeenCalledWith(
        EquipmentWriteOffEntity,
        expect.objectContaining({ equipmentId: EQUIPMENT_ID, quantity: 3, reason: 'Broken', writtenOffById: LAB_IN_CHARGE_ID }),
      );
    });

    it('throws 422 and does not mutate stock when the write-off quantity exceeds current stock', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem({ quantity: 2 }));

      await expect(
        service.writeOff(EQUIPMENT_ID, { quantity: 5, reason: 'Broken' }, LAB_IN_CHARGE_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('triggers an immediate low-stock evaluation after committing', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem({ quantity: 10 }));

      await service.writeOff(EQUIPMENT_ID, { quantity: 6, reason: 'Broken' }, LAB_IN_CHARGE_ID, false);

      expect(stockAlertService.evaluateItem).toHaveBeenCalledTimes(1);
    });

    it('throws ForbiddenException for a non-privileged, unrelated staff member', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem());

      await expect(
        service.writeOff(EQUIPMENT_ID, { quantity: 1, reason: 'Broken' }, OTHER_STAFF_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller to write off stock for any lab', async () => {
      equipmentRepo.findOne!.mockResolvedValue(makeItem({ quantity: 10 }));

      await expect(
        service.writeOff(EQUIPMENT_ID, { quantity: 1, reason: 'Broken' }, OTHER_STAFF_ID, true),
      ).resolves.toBeDefined();
    });
  });

  describe('findByLab', () => {
    it('computes lowStock per item', async () => {
      equipmentRepo.find!.mockResolvedValue([
        makeItem({ quantity: 2, minStockLevel: 5 }),
        makeItem({ id: 'e2', quantity: 20, minStockLevel: 5 }),
        makeItem({ id: 'e3', quantity: 20, minStockLevel: null }),
      ]);

      const result = await service.findByLab(LAB_ID);

      expect(result[0].lowStock).toBe(true);
      expect(result[1].lowStock).toBe(false);
      expect(result[2].lowStock).toBe(false);
    });
  });
});
