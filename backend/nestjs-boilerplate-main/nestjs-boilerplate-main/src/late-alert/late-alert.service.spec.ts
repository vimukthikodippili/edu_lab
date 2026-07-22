import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { LateAlertService } from './late-alert.service';
import { LateAlertEntity } from './entities/late-alert.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { LiveClassMonitorService, LiveClassStatusEntry } from '../live-class-monitor/live-class-monitor.service';
import { NotificationService } from '../notification/notification.service';

function buildEntry(overrides: Partial<LiveClassStatusEntry> = {}): LiveClassStatusEntry {
  return {
    timetableEntryId: 40,
    period: 3,
    periodStart: '2026-01-05T02:20:00.000Z', // 07:50 IST-ish, well in the past
    status: 'red',
    teacherId: 'teacher-1',
    teacherName: 'Nimal Perera',
    classSectionId: 27,
    classSectionName: 'C',
    gradeLevel: 9,
    subjectName: 'Mathematics',
    roomNumber: 'Room 5',
    checkedInAt: null,
    ...overrides,
  };
}

describe('LateAlertService', () => {
  let service: LateAlertService;
  let lateAlertRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let staffRepo: { find: jest.Mock; findOne: jest.Mock };
  let userRepo: { find: jest.Mock };
  let liveClassMonitorService: { getTodayStatusGrid: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };

  beforeEach(async () => {
    lateAlertRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'alert-1', ...data })),
    };
    staffRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) };
    userRepo = { find: jest.fn().mockResolvedValue([]) };
    liveClassMonitorService = { getTodayStatusGrid: jest.fn().mockResolvedValue([]) };
    notificationService = { createForStaff: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LateAlertService,
        { provide: getRepositoryToken(LateAlertEntity), useValue: lateAlertRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: LiveClassMonitorService, useValue: liveClassMonitorService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<LateAlertService>(LateAlertService);
  });

  describe('checkAndCreateAlerts', () => {
    it('creates an alert and notifies staff for a red (overdue) entry with no existing alert', async () => {
      liveClassMonitorService.getTodayStatusGrid.mockResolvedValue([buildEntry()]);
      lateAlertRepo.findOne.mockResolvedValue(null);
      userRepo.find.mockResolvedValue([{ id: 1, email: 'principal@sims.edu.lk' }]);
      staffRepo.findOne.mockResolvedValue({ id: 'principal-staff-1' });
      staffRepo.find.mockResolvedValue([{ id: 'sectionhead-staff-1' }]);

      await service.checkAndCreateAlerts();

      expect(lateAlertRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ timetableEntryId: 40, date: expect.any(String) }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'principal-staff-1',
        expect.any(String),
        expect.stringContaining('Nimal Perera'),
        'late_class_alert',
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'sectionhead-staff-1',
        expect.any(String),
        expect.any(String),
        'late_class_alert',
      );
    });

    it('dedup: does not create a duplicate alert or re-notify when one already exists for this period+date', async () => {
      liveClassMonitorService.getTodayStatusGrid.mockResolvedValue([buildEntry()]);
      lateAlertRepo.findOne.mockResolvedValue({ id: 'existing-alert' });

      await service.checkAndCreateAlerts();

      expect(lateAlertRepo.save).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('ignores non-red entries (amber, green, grey)', async () => {
      liveClassMonitorService.getTodayStatusGrid.mockResolvedValue([
        buildEntry({ timetableEntryId: 1, status: 'amber' }),
        buildEntry({ timetableEntryId: 2, status: 'green' }),
        buildEntry({ timetableEntryId: 3, status: 'grey' }),
      ]);

      await service.checkAndCreateAlerts();

      expect(lateAlertRepo.findOne).not.toHaveBeenCalled();
      expect(lateAlertRepo.save).not.toHaveBeenCalled();
    });

    it('on a unique-constraint violation from a racing cron tick, does not notify or throw', async () => {
      liveClassMonitorService.getTodayStatusGrid.mockResolvedValue([buildEntry()]);
      lateAlertRepo.findOne.mockResolvedValue(null);
      lateAlertRepo.save.mockRejectedValueOnce({ code: '23505' });

      await expect(service.checkAndCreateAlerts()).resolves.toBeUndefined();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('queries section heads by a grade range covering the entry (structural where-clause check)', async () => {
      liveClassMonitorService.getTodayStatusGrid.mockResolvedValue([buildEntry({ gradeLevel: 9 })]);
      lateAlertRepo.findOne.mockResolvedValue(null);

      await service.checkAndCreateAlerts();

      expect(staffRepo.find).toHaveBeenCalledWith({
        where: {
          sectionHeadGradeFrom: LessThanOrEqual(9),
          sectionHeadGradeTo: MoreThanOrEqual(9),
        },
      });
    });
  });

  describe('findAlerts', () => {
    it('returns all alerts unfiltered for a fully-privileged caller (null restrictToStaffId)', async () => {
      const alerts = [{ id: 'a1' }];
      lateAlertRepo.find.mockResolvedValue(alerts);

      const result = await service.findAlerts(undefined, null);

      expect(result).toBe(alerts);
      expect(staffRepo.findOne).not.toHaveBeenCalled();
    });

    it('filters by acknowledged=false via an IsNull where clause', async () => {
      await service.findAlerts(false, null);

      expect(lateAlertRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { acknowledgedAt: IsNull() } }),
      );
    });

    it('filters by acknowledged=true via a Not(IsNull()) where clause', async () => {
      await service.findAlerts(true, null);

      expect(lateAlertRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { acknowledgedAt: Not(IsNull()) } }),
      );
    });

    it('restricts a Section Head to alerts within their own configured grade range', async () => {
      staffRepo.findOne.mockResolvedValue({ sectionHeadGradeFrom: 6, sectionHeadGradeTo: 9 });
      lateAlertRepo.find.mockResolvedValue([
        { id: 'in-range', timetableEntry: { classSection: { grade: { level: 9 } } } },
        { id: 'out-of-range', timetableEntry: { classSection: { grade: { level: 12 } } } },
      ]);

      const result = await service.findAlerts(undefined, 'sectionhead-staff-1');

      expect(result.map((a) => a.id)).toEqual(['in-range']);
    });

    it('returns an empty array for a Section Head with no configured range, without querying alerts', async () => {
      staffRepo.findOne.mockResolvedValue({ sectionHeadGradeFrom: null, sectionHeadGradeTo: null });

      const result = await service.findAlerts(undefined, 'sectionhead-staff-1');

      expect(result).toEqual([]);
      expect(lateAlertRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('acknowledge', () => {
    it('throws NotFoundException when the alert does not exist', async () => {
      lateAlertRepo.findOne.mockResolvedValue(null);

      await expect(service.acknowledge('missing-id', 'staff-1', true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets acknowledgedAt and acknowledgedByStaffId for a fully-privileged caller', async () => {
      lateAlertRepo.findOne.mockResolvedValue({
        id: 'alert-1',
        timetableEntry: { classSection: { grade: { level: 9 } } },
      });

      const result = await service.acknowledge('alert-1', 'principal-staff-1', true);

      expect(result.acknowledgedByStaffId).toBe('principal-staff-1');
      expect(result.acknowledgedAt).toBeInstanceOf(Date);
    });

    it('allows a Section Head to acknowledge an alert within their own range', async () => {
      lateAlertRepo.findOne.mockResolvedValue({
        id: 'alert-1',
        timetableEntry: { classSection: { grade: { level: 9 } } },
      });
      staffRepo.findOne.mockResolvedValue({ sectionHeadGradeFrom: 6, sectionHeadGradeTo: 9 });

      const result = await service.acknowledge('alert-1', 'sectionhead-staff-1', false);

      expect(result.acknowledgedByStaffId).toBe('sectionhead-staff-1');
    });

    it('rejects a Section Head acknowledging an alert outside their own range', async () => {
      lateAlertRepo.findOne.mockResolvedValue({
        id: 'alert-1',
        timetableEntry: { classSection: { grade: { level: 12 } } },
      });
      staffRepo.findOne.mockResolvedValue({ sectionHeadGradeFrom: 6, sectionHeadGradeTo: 9 });

      await expect(service.acknowledge('alert-1', 'sectionhead-staff-1', false)).rejects.toThrow(
        ForbiddenException,
      );
      expect(lateAlertRepo.save).not.toHaveBeenCalled();
    });
  });
});
