import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { LabService } from './lab.service';
import { LabEntity } from './entities/lab.entity';
import { LabTypeEntity } from './entities/lab-type.entity';
import { LabBookingEntity } from './entities/lab-booking.entity';
import { StaffEntity } from '../staff/entities/staff.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  delete: jest.fn(),
});

const LAB_TYPE_ID = 'lab-type-uuid';
const LAB_IN_CHARGE_ID = 'staff-lab-in-charge';
const OTHER_STAFF_ID = 'staff-other';
const LAB_ID = 'lab-uuid';

const makeLab = (overrides: Partial<LabEntity> = {}): LabEntity =>
  ({
    id: LAB_ID,
    name: 'Chemistry Lab 1',
    labTypeId: LAB_TYPE_ID,
    labType: { id: LAB_TYPE_ID, name: 'Science' },
    capacity: 30,
    roomNumber: 'S-101',
    labInChargeId: LAB_IN_CHARGE_ID,
    isUnderMaintenance: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as LabEntity);

describe('LabService', () => {
  let service: LabService;
  let labRepo: MockRepo<LabEntity>;
  let labTypeRepo: MockRepo<LabTypeEntity>;
  let bookingRepo: MockRepo<LabBookingEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    labRepo = repoMock<LabEntity>();
    labTypeRepo = repoMock<LabTypeEntity>();
    bookingRepo = repoMock<LabBookingEntity>();
    staffRepo = repoMock<StaffEntity>();
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'freePeriod.schoolStartTime') return '07:30';
        if (key === 'freePeriod.periodDurationMinutes') return 40;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabService,
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
        { provide: getRepositoryToken(LabTypeEntity), useValue: labTypeRepo },
        { provide: getRepositoryToken(LabBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<LabService>(LabService);
    jest.clearAllMocks();
    labTypeRepo.findOne!.mockResolvedValue({ id: LAB_TYPE_ID, name: 'Science' });
    staffRepo.findOne!.mockResolvedValue({ id: LAB_IN_CHARGE_ID, firstName: 'Lab', lastName: 'Head' });
  });

  describe('create', () => {
    it('creates a lab when labType and labInCharge both exist', async () => {
      const result = await service.create({
        name: 'Chemistry Lab 1',
        labTypeId: LAB_TYPE_ID,
        capacity: 30,
        roomNumber: 'S-101',
        labInChargeId: LAB_IN_CHARGE_ID,
      });

      expect(labRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('rejects an unknown labTypeId — 422', async () => {
      labTypeRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.create({
          name: 'X', labTypeId: 'bogus', capacity: 10, roomNumber: 'R1', labInChargeId: LAB_IN_CHARGE_ID,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(labRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an unknown labInChargeId — 422', async () => {
      staffRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.create({
          name: 'X', labTypeId: LAB_TYPE_ID, capacity: 10, roomNumber: 'R1', labInChargeId: 'bogus',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(labRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('toggleMaintenance', () => {
    it('the assigned Lab In-Charge can toggle maintenance on their own lab', async () => {
      labRepo.findOne!.mockResolvedValue(makeLab());

      const result = await service.toggleMaintenance(LAB_ID, LAB_IN_CHARGE_ID, false, true);

      expect(labRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isUnderMaintenance: true }));
      expect(result).toBeDefined();
    });

    it('a privileged caller (admin/principal) can toggle maintenance on any lab', async () => {
      labRepo.findOne!.mockResolvedValue(makeLab());

      await service.toggleMaintenance(LAB_ID, OTHER_STAFF_ID, true, true);

      expect(labRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isUnderMaintenance: true }));
    });

    it('a non-privileged staff member who is not the Lab In-Charge is forbidden', async () => {
      labRepo.findOne!.mockResolvedValue(makeLab());

      await expect(
        service.toggleMaintenance(LAB_ID, OTHER_STAFF_ID, false, true),
      ).rejects.toThrow(ForbiddenException);
      expect(labRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown lab', async () => {
      labRepo.findOne!.mockResolvedValue(undefined);

      await expect(
        service.toggleMaintenance('missing-id', LAB_IN_CHARGE_ID, false, true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDirectory', () => {
    it('returns "maintenance" for a lab under maintenance, ignoring any booking', async () => {
      labRepo.find!.mockResolvedValue([makeLab({ isUnderMaintenance: true })]);
      bookingRepo.find!.mockResolvedValue([]);

      const [row] = await service.getDirectory();

      expect(row.availabilityStatus).toBe('maintenance');
    });

    it('returns "booked" for a lab with a booking covering the current period', async () => {
      labRepo.find!.mockResolvedValue([makeLab()]);

      const now = new Date();
      // Period 1 starts at 00:00 with a 1440-minute duration — covers the whole day, so "now"
      // always falls inside it regardless of when this test runs.
      configService.get.mockImplementation((key: string) => {
        if (key === 'freePeriod.schoolStartTime') return '00:00';
        if (key === 'freePeriod.periodDurationMinutes') return 1440;
        return undefined;
      });
      bookingRepo.find!.mockResolvedValue([
        { id: 'b1', labId: LAB_ID, date: now.toISOString().split('T')[0], periodNumber: 1 },
      ]);

      const [row] = await service.getDirectory();

      expect(row.availabilityStatus).toBe('booked');
    });

    it('returns "available" for a lab with no maintenance and no active booking', async () => {
      labRepo.find!.mockResolvedValue([makeLab()]);
      bookingRepo.find!.mockResolvedValue([]);

      const [row] = await service.getDirectory();

      expect(row.availabilityStatus).toBe('available');
    });

    it('returns an empty array when there are no labs', async () => {
      labRepo.find!.mockResolvedValue([]);

      const result = await service.getDirectory();

      expect(result).toEqual([]);
      expect(bookingRepo.find).not.toHaveBeenCalled();
    });
  });
});
