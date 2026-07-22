import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { EquipmentStockAlertService } from './equipment-stock-alert.service';
import { EquipmentEntity } from './entities/equipment.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const LAB_ID = 'lab-uuid';
const LAB_IN_CHARGE_ID = 'staff-lab-in-charge';

const makeLab = (): LabEntity => ({ id: LAB_ID, name: 'Chemistry Lab 1', labInChargeId: LAB_IN_CHARGE_ID } as LabEntity);

const makeItem = (overrides: Partial<EquipmentEntity> = {}): EquipmentEntity =>
  ({
    id: 'equipment-uuid',
    labId: LAB_ID,
    name: 'Sodium Chloride',
    quantity: 2,
    unit: 'g',
    minStockLevel: 5,
    lowStockNotifiedAt: null,
    ...overrides,
  } as EquipmentEntity);

describe('EquipmentStockAlertService', () => {
  let service: EquipmentStockAlertService;
  let equipmentRepo: MockRepo<EquipmentEntity>;
  let labRepo: MockRepo<LabEntity>;
  let notificationService: { createForStaff: jest.Mock };

  beforeEach(async () => {
    equipmentRepo = repoMock<EquipmentEntity>();
    labRepo = repoMock<LabEntity>();
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentStockAlertService,
        { provide: getRepositoryToken(EquipmentEntity), useValue: equipmentRepo },
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<EquipmentStockAlertService>(EquipmentStockAlertService);
    jest.clearAllMocks();
  });

  describe('evaluateItem — the explicitly-requested low-stock alert trigger test', () => {
    it('notifies once when quantity crosses to/below minStockLevel and sets lowStockNotifiedAt', async () => {
      const item = makeItem({ quantity: 3, minStockLevel: 5, lowStockNotifiedAt: null });

      const notified = await service.evaluateItem(item, makeLab());

      expect(notified).toBe(true);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        LAB_IN_CHARGE_ID,
        expect.any(String),
        expect.stringContaining('Sodium Chloride'),
        'equipment_low_stock',
      );
      expect(item.lowStockNotifiedAt).toBeInstanceOf(Date);
      expect(equipmentRepo.save).toHaveBeenCalledWith(item);
    });

    it('does not send a duplicate notification while still low and already notified', async () => {
      const item = makeItem({ quantity: 3, minStockLevel: 5, lowStockNotifiedAt: new Date('2026-07-01') });

      const notified = await service.evaluateItem(item, makeLab());

      expect(notified).toBe(false);
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
      expect(equipmentRepo.save).not.toHaveBeenCalled();
    });

    it('clears lowStockNotifiedAt once restocked above the minimum, without notifying', async () => {
      const item = makeItem({ quantity: 10, minStockLevel: 5, lowStockNotifiedAt: new Date('2026-07-01') });

      const notified = await service.evaluateItem(item, makeLab());

      expect(notified).toBe(false);
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
      expect(item.lowStockNotifiedAt).toBeNull();
      expect(equipmentRepo.save).toHaveBeenCalledWith(item);
    });

    it('notifies again after a restock-then-redrop (crossing-based, not once-ever)', async () => {
      const item = makeItem({ quantity: 3, minStockLevel: 5, lowStockNotifiedAt: null });

      const notified = await service.evaluateItem(item, makeLab());

      expect(notified).toBe(true);
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
    });

    it('is a no-op for items with no minStockLevel', async () => {
      const item = makeItem({ quantity: 0, minStockLevel: null });

      const notified = await service.evaluateItem(item, makeLab());

      expect(notified).toBe(false);
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
      expect(equipmentRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('checkLowStock', () => {
    it('only queries equipment with a non-null minStockLevel', async () => {
      equipmentRepo.find!.mockResolvedValue([]);

      await service.checkLowStock();

      expect(equipmentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ minStockLevel: expect.anything() }) }),
      );
    });

    it('evaluates every tracked item against its lab and notifies where crossed', async () => {
      const item = makeItem({ quantity: 1, minStockLevel: 5, lowStockNotifiedAt: null });
      equipmentRepo.find!.mockResolvedValue([item]);
      labRepo.find!.mockResolvedValue([makeLab()]);

      await service.checkLowStock();

      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
    });

    it('does nothing when there are no tracked items', async () => {
      equipmentRepo.find!.mockResolvedValue([]);

      await service.checkLowStock();

      expect(labRepo.find).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });
  });
});
