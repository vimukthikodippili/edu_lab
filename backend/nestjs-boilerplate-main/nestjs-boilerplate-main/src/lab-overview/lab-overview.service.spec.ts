import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { LabOverviewService } from './lab-overview.service';
import { LabEntity } from '../labs/entities/lab.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { EquipmentEntity } from '../equipment/entities/equipment.entity';
import { EquipmentDamageReportEntity } from '../session-equipment/entities/equipment-damage-report.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { LabReportAssignmentEntity } from '../lab-reports/entities/lab-report-assignment.entity';
import { LabReportSubmissionEntity } from '../lab-reports/entities/lab-report-submission.entity';
import { StudentEntity } from '../students/entities/student.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
});

describe('LabOverviewService', () => {
  let service: LabOverviewService;
  let labRepo: MockRepo<LabEntity>;
  let bookingRepo: MockRepo<LabBookingEntity>;
  let equipmentRepo: MockRepo<EquipmentEntity>;
  let damageReportRepo: MockRepo<EquipmentDamageReportEntity>;
  let experimentLogRepo: MockRepo<ExperimentLogEntity>;
  let assignmentRepo: MockRepo<LabReportAssignmentEntity>;
  let submissionRepo: MockRepo<LabReportSubmissionEntity>;
  let studentRepo: MockRepo<StudentEntity>;

  beforeEach(async () => {
    labRepo = repoMock<LabEntity>();
    bookingRepo = repoMock<LabBookingEntity>();
    equipmentRepo = repoMock<EquipmentEntity>();
    damageReportRepo = repoMock<EquipmentDamageReportEntity>();
    experimentLogRepo = repoMock<ExperimentLogEntity>();
    assignmentRepo = repoMock<LabReportAssignmentEntity>();
    submissionRepo = repoMock<LabReportSubmissionEntity>();
    studentRepo = repoMock<StudentEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabOverviewService,
        { provide: getRepositoryToken(LabEntity), useValue: labRepo },
        { provide: getRepositoryToken(LabBookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(EquipmentEntity), useValue: equipmentRepo },
        { provide: getRepositoryToken(EquipmentDamageReportEntity), useValue: damageReportRepo },
        { provide: getRepositoryToken(ExperimentLogEntity), useValue: experimentLogRepo },
        { provide: getRepositoryToken(LabReportAssignmentEntity), useValue: assignmentRepo },
        { provide: getRepositoryToken(LabReportSubmissionEntity), useValue: submissionRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    service = module.get<LabOverviewService>(LabOverviewService);
  });

  describe('getLabUtilisation', () => {
    it('computes confirmed-booking counts and utilisationRate against a real 2-week slot total', async () => {
      labRepo.find!.mockResolvedValue([
        { id: 'lab-1', name: 'Chemistry Lab 1' },
        { id: 'lab-2', name: 'Computer Lab 1' },
      ]);
      bookingRepo.find!.mockResolvedValue([
        { labId: 'lab-1' }, { labId: 'lab-1' }, { labId: 'lab-1' },
        { labId: 'lab-2' },
      ]);

      const rows = await service.getLabUtilisation({
        dateFrom: '2026-07-01', dateTo: '2026-07-14', workingDaysPerWeek: 5, periodsPerDay: 8,
      });

      // 14 days = 2 weeks -> totalAvailableSlots = 2 * 5 * 8 = 80
      expect(rows.find((r) => r.labId === 'lab-1')).toEqual({
        labId: 'lab-1', labName: 'Chemistry Lab 1', confirmedBookings: 3, totalAvailableSlots: 80, utilisationRate: 3 / 80,
      });
      expect(rows.find((r) => r.labId === 'lab-2')?.confirmedBookings).toBe(1);
    });

    it('leaves totalAvailableSlots and utilisationRate null when no date range is given', async () => {
      labRepo.find!.mockResolvedValue([{ id: 'lab-1', name: 'Chemistry Lab 1' }]);
      bookingRepo.find!.mockResolvedValue([{ labId: 'lab-1' }]);

      const rows = await service.getLabUtilisation({});

      expect(rows[0].totalAvailableSlots).toBeNull();
      expect(rows[0].utilisationRate).toBeNull();
      expect(rows[0].confirmedBookings).toBe(1);
    });

    it('scopes to a single lab when labId is given', async () => {
      labRepo.find!.mockResolvedValue([{ id: 'lab-1', name: 'Chemistry Lab 1' }]);

      await service.getLabUtilisation({ labId: 'lab-1' });

      expect(labRepo.find).toHaveBeenCalledWith({ where: { id: 'lab-1' } });
    });
  });

  describe('getEquipmentHealth', () => {
    it('groups equipment by condition, flags low stock, and excludes items with no minStockLevel', async () => {
      equipmentRepo.find!.mockResolvedValue([
        { id: 'e1', name: 'Beaker Set', labId: 'lab-1', condition: 'good', quantity: 10, minStockLevel: null },
        { id: 'e2', name: 'Sodium Chloride', labId: 'lab-1', condition: 'fair', quantity: 2, minStockLevel: 5 },
        { id: 'e3', name: 'Broken Microscope', labId: 'lab-1', condition: 'poor', quantity: 1, minStockLevel: null },
        { id: 'e4', name: 'Full Stock Item', labId: 'lab-1', condition: 'good', quantity: 20, minStockLevel: 5 },
      ]);
      labRepo.find!.mockResolvedValue([{ id: 'lab-1', name: 'Chemistry Lab 1' }]);
      damageReportRepo.find!.mockResolvedValue([]);

      const result = await service.getEquipmentHealth({});

      expect(result.conditionCounts).toEqual({ good: 2, fair: 1, poor: 1 });
      expect(result.poorConditionItems).toEqual([
        { id: 'e3', name: 'Broken Microscope', labId: 'lab-1', labName: 'Chemistry Lab 1' },
      ]);
      // e2 is low stock (2 <= 5); e4 is not (20 > 5); e1/e3 excluded (minStockLevel null)
      expect(result.lowStockCount).toBe(1);
      expect(result.lowStockItems).toEqual([
        { id: 'e2', name: 'Sodium Chloride', labId: 'lab-1', labName: 'Chemistry Lab 1', quantity: 2, minStockLevel: 5 },
      ]);
    });

    it('groups damage reports by type and applies labId/subjectId/classSectionId filtering in-memory', async () => {
      equipmentRepo.find!.mockResolvedValue([]);
      labRepo.find!.mockResolvedValue([{ id: 'lab-1', name: 'Chemistry Lab 1' }]);
      damageReportRepo.find!.mockResolvedValue([
        {
          id: 'd1', reportType: 'damaged', quantity: 1, reportedAt: new Date('2026-07-10T00:00:00Z'),
          equipment: { name: 'Bunsen Burner' },
          labBooking: { labId: 'lab-1', subjectId: 'subj-1', classSectionId: 27 },
        },
        {
          id: 'd2', reportType: 'missing', quantity: 1, reportedAt: new Date('2026-07-11T00:00:00Z'),
          equipment: { name: 'Test Tube' },
          labBooking: { labId: 'lab-2', subjectId: 'subj-2', classSectionId: 28 },
        },
      ]);

      const result = await service.getEquipmentHealth({ labId: 'lab-1' });

      expect(result.damageReportsByType).toEqual({ damaged: 1, missing: 0 });
      expect(result.recentDamageReports).toHaveLength(1);
      expect(result.recentDamageReports[0].equipmentName).toBe('Bunsen Burner');
    });
  });

  describe('getExperimentCoverage', () => {
    it('groups experiment logs by (classSectionId, labId) and counts correctly', async () => {
      experimentLogRepo.find!.mockResolvedValue([
        { labBooking: { labId: 'lab-1', classSectionId: 27, subjectId: 'subj-1', date: '2026-07-05', classSection: { name: 'C' } } },
        { labBooking: { labId: 'lab-1', classSectionId: 27, subjectId: 'subj-1', date: '2026-07-08', classSection: { name: 'C' } } },
        { labBooking: { labId: 'lab-2', classSectionId: 27, subjectId: 'subj-2', date: '2026-07-09', classSection: { name: 'C' } } },
        { labBooking: { labId: 'lab-1', classSectionId: null, subjectId: null, date: '2026-07-10', classSection: null } },
      ]);
      labRepo.find!.mockResolvedValue([
        { id: 'lab-1', name: 'Chemistry Lab 1' },
        { id: 'lab-2', name: 'Computer Lab 1' },
      ]);

      const rows = await service.getExperimentCoverage({});

      expect(rows).toHaveLength(2); // (27,lab-1) and (27,lab-2); the null-classSection row is excluded
      expect(rows.find((r) => r.labId === 'lab-1')?.experimentCount).toBe(2);
      expect(rows.find((r) => r.labId === 'lab-2')?.experimentCount).toBe(1);
    });

    it('filters by date range using string comparison on the booking date', async () => {
      experimentLogRepo.find!.mockResolvedValue([
        { labBooking: { labId: 'lab-1', classSectionId: 27, subjectId: 'subj-1', date: '2026-06-01', classSection: { name: 'C' } } },
        { labBooking: { labId: 'lab-1', classSectionId: 27, subjectId: 'subj-1', date: '2026-07-05', classSection: { name: 'C' } } },
      ]);
      labRepo.find!.mockResolvedValue([{ id: 'lab-1', name: 'Chemistry Lab 1' }]);

      const rows = await service.getExperimentCoverage({ dateFrom: '2026-07-01', dateTo: '2026-07-31' });

      expect(rows).toHaveLength(1);
      expect(rows[0].experimentCount).toBe(1);
    });
  });

  describe('getLabReportPerformance', () => {
    const assignment = (over: Partial<Record<string, unknown>> = {}) => ({
      id: 'a1', classSectionId: 27, subjectId: 'subj-1', dueDate: '2026-08-01',
      classSection: { name: 'C' }, subject: { name: 'Chemistry' },
      experimentLog: { labBooking: { labId: 'lab-1' } },
      ...over,
    });

    it('computes averageGrade excluding ungraded submissions, and submissionRate against assignments*enrolled', async () => {
      assignmentRepo.find!.mockResolvedValue([assignment()]);
      submissionRepo.find!.mockResolvedValue([
        { labReportAssignmentId: 'a1', grade: '20.00' },
        { labReportAssignmentId: 'a1', grade: '10.00' },
        { labReportAssignmentId: 'a1', grade: null },
      ]);
      studentRepo.count!.mockResolvedValue(10);

      const rows = await service.getLabReportPerformance({});

      expect(rows).toHaveLength(1);
      expect(rows[0].averageGrade).toBe(15); // (20+10)/2, the null-grade row excluded
      expect(rows[0].submissionRate).toBeCloseTo(3 / 10); // 3 submissions / (1 assignment * 10 enrolled)
      expect(rows[0].assignmentCount).toBe(1);
    });

    it('returns averageGrade null when nothing has been graded yet', async () => {
      assignmentRepo.find!.mockResolvedValue([assignment()]);
      submissionRepo.find!.mockResolvedValue([{ labReportAssignmentId: 'a1', grade: null }]);
      studentRepo.count!.mockResolvedValue(10);

      const rows = await service.getLabReportPerformance({});

      expect(rows[0].averageGrade).toBeNull();
    });

    it('returns submissionRate 0, not NaN, when the class section has zero enrolled students', async () => {
      assignmentRepo.find!.mockResolvedValue([assignment()]);
      submissionRepo.find!.mockResolvedValue([]);
      studentRepo.count!.mockResolvedValue(0);

      const rows = await service.getLabReportPerformance({});

      expect(rows[0].submissionRate).toBe(0);
    });

    it('filters by labId via the experimentLog -> labBooking relation chain', async () => {
      assignmentRepo.find!.mockResolvedValue([
        assignment({ id: 'a1', experimentLog: { labBooking: { labId: 'lab-1' } } }),
        assignment({ id: 'a2', experimentLog: { labBooking: { labId: 'lab-2' } } }),
      ]);
      submissionRepo.find!.mockResolvedValue([]);
      studentRepo.count!.mockResolvedValue(5);

      const rows = await service.getLabReportPerformance({ labId: 'lab-2' });

      expect(rows).toHaveLength(1);
      expect(rows[0].assignmentCount).toBe(1);
    });
  });
});
