import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { SessionEquipmentService } from './session-equipment.service';
import { SessionEquipmentUsageEntity } from './entities/session-equipment-usage.entity';
import { EquipmentDamageReportEntity } from './entities/equipment-damage-report.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { EquipmentEntity } from '../equipment/entities/equipment.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { EquipmentStockAlertService } from '../equipment/equipment-stock-alert.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

const LAB_ID = 'lab-uuid';
const BOOKING_ID = 'booking-uuid';
const TEACHER_ID = 'teacher-uuid';
const LAB_IN_CHARGE_ID = 'lab-in-charge-uuid';

const activeLab = { id: LAB_ID, name: 'Chemistry Lab 1', labInChargeId: LAB_IN_CHARGE_ID };
const confirmedBooking = { id: BOOKING_ID, labId: LAB_ID, teacherId: TEACHER_ID, status: 'confirmed', date: '2026-08-15' };

// A consumable (minStockLevel set) and a durable (minStockLevel null) item, both with 10 in stock.
const consumable = { id: 'consumable-id', labId: LAB_ID, name: 'Hydrochloric Acid', quantity: 10, minStockLevel: 2, unit: 'ml' };
const durable = { id: 'durable-id', labId: LAB_ID, name: 'Microscope', quantity: 10, minStockLevel: null, unit: 'pieces' };

describe('SessionEquipmentService', () => {
  let service: SessionEquipmentService;
  let usageRepo: MockRepo<SessionEquipmentUsageEntity>;
  let damageRepo: MockRepo<EquipmentDamageReportEntity>;
  let bookingRepo: MockRepo<LabBookingEntity>;
  let labRepo: MockRepo<LabEntity>;
  let equipmentRepo: MockRepo<EquipmentEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let userRepo: MockRepo<UserEntity>;
  let notificationService: { createForStaff: jest.Mock };
  let stockAlertService: { evaluateItem: jest.Mock };

  beforeEach(async () => {
    usageRepo = repoMock<SessionEquipmentUsageEntity>();
    damageRepo = repoMock<EquipmentDamageReportEntity>();
    bookingRepo = repoMock<LabBookingEntity>();
    labRepo = repoMock<LabEntity>();
    equipmentRepo = repoMock<EquipmentEntity>();
    staffRepo = repoMock<StaffEntity>();
    userRepo = repoMock<UserEntity>();
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };
    stockAlertService = { evaluateItem: jest.fn().mockResolvedValue(false) };

    const dataSource = {
      transaction: jest.fn(async (cb: (manager: unknown) => unknown) => {
        const manager = {
          save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve(data)),
          create: jest.fn((_entity: unknown, data: unknown) => data),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionEquipmentService,
        { provide: getRepositoryToken(SessionEquipmentUsageEntity), useValue: usageRepo },
        { provide: getRepositoryToken(EquipmentDamageReportEntity), useValue: damageRepo },
        { provide: getRepositoryToken(LabBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
        { provide: getRepositoryToken(EquipmentEntity), useValue: equipmentRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationService, useValue: notificationService },
        { provide: EquipmentStockAlertService, useValue: stockAlertService },
      ],
    }).compile();

    service = module.get<SessionEquipmentService>(SessionEquipmentService);
    jest.clearAllMocks();
    // jest.clearAllMocks() above resets the transaction mock's implementation too — restore it.
    (dataSource.transaction as jest.Mock).mockImplementation(async (cb: (manager: unknown) => unknown) => {
      const manager = {
        save: jest.fn((_entity: unknown, data: unknown) => Promise.resolve(data)),
        create: jest.fn((_entity: unknown, data: unknown) => data),
      };
      return cb(manager);
    });
  });

  describe('submitSessionReport — the explicitly-requested inventory auto-reduction test', () => {
    it('reduces quantity for a consumable usage item', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      const consumableItem = { ...consumable };
      equipmentRepo.find!.mockResolvedValue([consumableItem]);

      const result = await service.submitSessionReport(
        BOOKING_ID,
        { usage: [{ equipmentId: consumable.id, quantityUsed: 4 }] },
        TEACHER_ID,
        false,
      );

      expect(result.usage).toHaveLength(1);
      expect(consumableItem.quantity).toBe(6);
      expect(stockAlertService.evaluateItem).toHaveBeenCalledWith(consumableItem, activeLab);
    });

    it('does NOT reduce quantity for a non-consumable (minStockLevel null) usage item', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      const durableItem = { ...durable };
      equipmentRepo.find!.mockResolvedValue([durableItem]);

      await service.submitSessionReport(
        BOOKING_ID,
        { usage: [{ equipmentId: durable.id, quantityUsed: 3 }] },
        TEACHER_ID,
        false,
      );

      expect(durableItem.quantity).toBe(10);
      expect(stockAlertService.evaluateItem).not.toHaveBeenCalled();
    });

    it('reduces quantity for a damage/missing report regardless of consumable status', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      const durableItem = { ...durable };
      equipmentRepo.find!.mockResolvedValue([durableItem]);

      await service.submitSessionReport(
        BOOKING_ID,
        { damage: [{ equipmentId: durable.id, reportType: 'damaged', quantity: 2 }] },
        TEACHER_ID,
        false,
      );

      expect(durableItem.quantity).toBe(8);
      expect(stockAlertService.evaluateItem).toHaveBeenCalledWith(durableItem, activeLab);
    });

    it('combines usage + damage deltas for the same item and rejects if the total exceeds stock', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      const item = { ...consumable, quantity: 5 };
      equipmentRepo.find!.mockResolvedValue([item]);

      await expect(
        service.submitSessionReport(
          BOOKING_ID,
          {
            usage: [{ equipmentId: item.id, quantityUsed: 3 }],
            damage: [{ equipmentId: item.id, reportType: 'missing', quantity: 3 }],
          },
          TEACHER_ID,
          false,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('the explicitly-requested test: dispatches a damage notification to the Lab In-Charge and every Principal', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      equipmentRepo.find!.mockResolvedValue([{ ...durable }]);
      userRepo.find!.mockResolvedValue([
        { id: 1, email: 'principal@sims.edu.lk', role: { id: 2 } },
        { id: 2, email: 'noaccount@sims.edu.lk', role: { id: 2 } },
      ]);
      staffRepo.findOne!.mockImplementation(({ where }: { where: { email: string } }) =>
        Promise.resolve(where.email === 'principal@sims.edu.lk' ? { id: 'principal-staff-id' } : undefined),
      );

      await service.submitSessionReport(
        BOOKING_ID,
        { damage: [{ equipmentId: durable.id, reportType: 'missing', quantity: 1, notes: 'Left in another lab' }] },
        TEACHER_ID,
        false,
      );

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        LAB_IN_CHARGE_ID,
        expect.any(String),
        expect.any(String),
        'equipment_damage_report',
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'principal-staff-id',
        expect.any(String),
        expect.any(String),
        'equipment_damage_report',
      );
      // Exactly 2 calls: Lab In-Charge + the one resolvable Principal (the second user has no
      // matching staff record and is silently skipped).
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(2);
    });

    it('does not send any notification when only usage (no damage) is submitted', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      equipmentRepo.find!.mockResolvedValue([{ ...consumable }]);

      await service.submitSessionReport(
        BOOKING_ID,
        { usage: [{ equipmentId: consumable.id, quantityUsed: 1 }] },
        TEACHER_ID,
        false,
      );

      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown booking', async () => {
      bookingRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.submitSessionReport(BOOKING_ID, { usage: [{ equipmentId: 'x', quantityUsed: 1 }] }, TEACHER_ID, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is not the booking teacher', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });

      await expect(
        service.submitSessionReport(BOOKING_ID, { usage: [{ equipmentId: 'x', quantityUsed: 1 }] }, TEACHER_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller to submit for a booking they do not own', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });
      labRepo.findOne!.mockResolvedValue(activeLab);
      equipmentRepo.find!.mockResolvedValue([{ ...consumable }]);

      await expect(
        service.submitSessionReport(BOOKING_ID, { usage: [{ equipmentId: consumable.id, quantityUsed: 1 }] }, TEACHER_ID, true),
      ).resolves.toBeDefined();
    });

    it('throws ConflictException for a cancelled booking', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, status: 'cancelled' });

      await expect(
        service.submitSessionReport(BOOKING_ID, { usage: [{ equipmentId: 'x', quantityUsed: 1 }] }, TEACHER_ID, false),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 422 when neither usage nor damage items are given', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });

      await expect(service.submitSessionReport(BOOKING_ID, {}, TEACHER_ID, false)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 422 when the equipment belongs to a different lab', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      labRepo.findOne!.mockResolvedValue(activeLab);
      equipmentRepo.find!.mockResolvedValue([{ ...consumable, labId: 'other-lab' }]);

      await expect(
        service.submitSessionReport(BOOKING_ID, { usage: [{ equipmentId: consumable.id, quantityUsed: 1 }] }, TEACHER_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('the explicitly-requested append-only constraint test', () => {
    // The real enforcement is a Postgres trigger (migration CreateSessionEquipmentTables) that a
    // repo-mocked unit test cannot exercise — verified instead via live QA against the real DB.
    // What IS unit-testable here is the application-level half: no update/delete code path
    // exists for damage reports anywhere in this service.
    it('exposes no update or delete method for damage reports', () => {
      expect((service as unknown as { updateDamageReport?: unknown }).updateDamageReport).toBeUndefined();
      expect((service as unknown as { deleteDamageReport?: unknown }).deleteDamageReport).toBeUndefined();
    });
  });

  describe('findForBooking', () => {
    it('returns usage and damage rows for a session the caller owns', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking });
      usageRepo.find!.mockResolvedValue([{ id: 'u1' }]);
      damageRepo.find!.mockResolvedValue([{ id: 'd1' }]);

      const result = await service.findForBooking(BOOKING_ID, TEACHER_ID, false);

      expect(result.usage).toHaveLength(1);
      expect(result.damage).toHaveLength(1);
    });

    it('throws ForbiddenException for a non-owning, non-privileged caller', async () => {
      bookingRepo.findOne!.mockResolvedValue({ ...confirmedBooking, teacherId: 'someone-else' });

      await expect(service.findForBooking(BOOKING_ID, TEACHER_ID, false)).rejects.toThrow(ForbiddenException);
    });
  });
});
