import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { DamageReportService } from './damage-report.service';
import { EquipmentDamageReportEntity } from './entities/equipment-damage-report.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
});

const LAB_ID = 'lab-uuid';
const STAFF_ID = 'staff-uuid';
const BOOKING_ID = 'booking-uuid';

describe('DamageReportService', () => {
  let service: DamageReportService;
  let reportRepo: MockRepo<EquipmentDamageReportEntity>;
  let bookingRepo: MockRepo<LabBookingEntity>;
  let labRepo: MockRepo<LabEntity>;

  beforeEach(async () => {
    reportRepo = repoMock<EquipmentDamageReportEntity>();
    bookingRepo = repoMock<LabBookingEntity>();
    labRepo = repoMock<LabEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DamageReportService,
        { provide: getRepositoryToken(EquipmentDamageReportEntity), useValue: reportRepo },
        { provide: getRepositoryToken(LabBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
      ],
    }).compile();

    service = module.get<DamageReportService>(DamageReportService);
    jest.clearAllMocks();
  });

  it('returns reports scoped to a given labId when the caller is that lab\'s Lab In-Charge', async () => {
    labRepo.findOne!.mockResolvedValue({ id: LAB_ID, name: 'Chemistry Lab 1', labInChargeId: STAFF_ID });
    labRepo.find!.mockResolvedValue([{ id: LAB_ID, name: 'Chemistry Lab 1' }]);
    bookingRepo.find!.mockResolvedValue([{ id: BOOKING_ID, labId: LAB_ID, date: '2026-08-15' }]);
    reportRepo.find!.mockResolvedValue([{ id: 'r1', labBookingId: BOOKING_ID, reportType: 'damaged' }]);

    const result = await service.findReports({ labId: LAB_ID }, STAFF_ID, false);

    expect(result).toHaveLength(1);
    expect(result[0].labId).toBe(LAB_ID);
    expect(result[0].labName).toBe('Chemistry Lab 1');
  });

  it('throws ForbiddenException when a non-privileged caller requests a labId they do not own', async () => {
    labRepo.findOne!.mockResolvedValue({ id: LAB_ID, labInChargeId: 'someone-else' });

    await expect(service.findReports({ labId: LAB_ID }, STAFF_ID, false)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException for an unknown labId', async () => {
    labRepo.findOne!.mockResolvedValue(undefined);

    await expect(service.findReports({ labId: LAB_ID }, STAFF_ID, false)).rejects.toThrow(NotFoundException);
  });

  it('scopes a non-privileged caller with no labId to only labs they are in charge of', async () => {
    labRepo.find!.mockResolvedValue([{ id: LAB_ID }]);
    bookingRepo.find!.mockResolvedValue([{ id: BOOKING_ID, labId: LAB_ID }]);
    reportRepo.find!.mockResolvedValue([]);

    await service.findReports({}, STAFF_ID, false);

    expect(labRepo.find).toHaveBeenCalledWith({ where: { labInChargeId: STAFF_ID } });
  });

  it('returns an empty list without querying reports when the caller is in charge of no labs', async () => {
    labRepo.find!.mockResolvedValue([]);

    const result = await service.findReports({}, STAFF_ID, false);

    expect(result).toEqual([]);
    expect(reportRepo.find).not.toHaveBeenCalled();
  });

  it('lets a privileged caller with no labId see reports across every lab', async () => {
    reportRepo.find!.mockResolvedValue([]);

    await service.findReports({}, STAFF_ID, true);

    expect(labRepo.find).not.toHaveBeenCalled();
    expect(bookingRepo.find).not.toHaveBeenCalled();
    expect(reportRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('filters by reportType', async () => {
    reportRepo.find!.mockResolvedValue([]);

    await service.findReports({ reportType: 'missing' }, STAFF_ID, true);

    expect(reportRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ reportType: 'missing' }) }),
    );
  });

  it('filters by a date range', async () => {
    reportRepo.find!.mockResolvedValue([]);

    await service.findReports({ dateFrom: '2026-08-01', dateTo: '2026-08-31' }, STAFF_ID, true);

    expect(reportRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ reportedAt: expect.anything() }) }),
    );
  });
});
