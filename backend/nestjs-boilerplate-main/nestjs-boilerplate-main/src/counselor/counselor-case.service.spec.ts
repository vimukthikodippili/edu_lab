import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { getMetadataArgsStorage } from 'typeorm';
import {
  CounselorCaseService,
  FORBIDDEN_CLINICAL_TERMS,
  buildCaseTriggerSummary,
} from './counselor-case.service';
import {
  CounselorCaseEntity,
  CounselorCasePriority,
  CounselorCaseStatus,
  CounselorCaseTriggerType,
} from './entities/counselor-case.entity';
import { BehavioralObservationEntity } from './entities/behavioral-observation.entity';
import { MoodCheckInService } from '../mood-check-in/mood-check-in.service';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { StaffService } from '../staff/staff.service';
import { NotificationService } from '../notification/notification.service';

describe('CounselorCaseEntity — structural non-clinical schema guarantee', () => {
  it('has exactly the expected column set, with no diagnosis/severity/label column of any kind', () => {
    const columnNames = getMetadataArgsStorage()
      .columns.filter((c) => c.target === CounselorCaseEntity)
      .map((c) => c.propertyName)
      .sort();

    expect(columnNames).toEqual(
      [
        'id',
        'studentId',
        'triggerType',
        'triggerSummary',
        'status',
        'priority',
        'createdAt',
        'closedAt',
        'closedByStaffId',
      ].sort(),
    );

    const forbidden = ['severity', 'label', 'category', 'score', 'level', 'rating', 'risk', 'diagnosis'];
    for (const name of columnNames) {
      expect(forbidden).not.toContain(name.toLowerCase());
    }
  });
});

describe('buildCaseTriggerSummary — content safety', () => {
  it('never contains any forbidden clinical/disorder-name substring, for either trigger type across a range of counts', () => {
    const counts = [1, 2, 3, 4, 5, 10, 20];
    const types = [
      CounselorCaseTriggerType.BEHAVIORAL_OBSERVATIONS,
      CounselorCaseTriggerType.LOW_MOOD_CHECKINS,
    ];

    for (const type of types) {
      for (const count of counts) {
        const summary = buildCaseTriggerSummary(type, count).toLowerCase();
        for (const term of FORBIDDEN_CLINICAL_TERMS) {
          expect(summary).not.toContain(term);
        }
      }
    }
  });

  it('describes the pattern in plain language matching the acceptance criteria example', () => {
    expect(buildCaseTriggerSummary(CounselorCaseTriggerType.LOW_MOOD_CHECKINS, 3)).toBe(
      '3 low mood check-ins this week',
    );
    expect(
      buildCaseTriggerSummary(CounselorCaseTriggerType.BEHAVIORAL_OBSERVATIONS, 4),
    ).toBe('4 behavioral observations logged this week');
  });
});

describe('CounselorCaseService', () => {
  let service: CounselorCaseService;
  let caseRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let observationRepo: { find: jest.Mock };
  let userRepo: { find: jest.Mock };
  let moodCheckInService: { findLowMoodCheckInsSince: jest.Mock };
  let staffService: { findByEmail: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let configService: { get: jest.Mock };

  const COUNSELOR_STAFF_ID = 'staff-counselor-1';

  beforeEach(async () => {
    caseRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'case-1', ...d })),
    };
    observationRepo = { find: jest.fn().mockResolvedValue([]) };
    userRepo = {
      find: jest
        .fn()
        .mockResolvedValue([{ id: 1, email: 'counselor@sims.edu.lk' }]),
    };
    moodCheckInService = { findLowMoodCheckInsSince: jest.fn().mockResolvedValue([]) };
    staffService = {
      findByEmail: jest.fn().mockResolvedValue({ id: COUNSELOR_STAFF_ID }),
    };
    // Only createForStaff is implemented — if the service ever tried a different
    // notification path, calling it here would throw "not a function" and fail the test.
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, number> = {
          'wellbeingCase.lookbackDays': 7,
          'wellbeingCase.observationThreshold': 3,
          'wellbeingCase.lowMoodThreshold': 3,
          'wellbeingCase.lowMoodMaxValue': 2,
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounselorCaseService,
        { provide: getRepositoryToken(CounselorCaseEntity), useValue: caseRepo },
        { provide: getRepositoryToken(BehavioralObservationEntity), useValue: observationRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: MoodCheckInService, useValue: moodCheckInService },
        { provide: StaffService, useValue: staffService },
        { provide: NotificationService, useValue: notificationService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CounselorCaseService>(CounselorCaseService);
  });

  describe('detectAndCreateCases', () => {
    it('creates exactly one case and sends exactly one notification when observations cross the threshold', async () => {
      observationRepo.find.mockResolvedValue([
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
      ]);

      await service.detectAndCreateCases();

      expect(caseRepo.save).toHaveBeenCalledTimes(1);
      expect(caseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-1',
          triggerType: CounselorCaseTriggerType.BEHAVIORAL_OBSERVATIONS,
          triggerSummary: '3 behavioral observations logged this week',
          status: CounselorCaseStatus.OPEN,
        }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        COUNSELOR_STAFF_ID,
        expect.any(String),
        expect.stringContaining('3 behavioral observations logged this week'),
        'counselor_case',
      );
    });

    it('creates exactly one case and sends exactly one notification when low mood check-ins cross the threshold', async () => {
      moodCheckInService.findLowMoodCheckInsSince.mockResolvedValue([
        { studentId: 'student-2', date: '2026-01-01', moodValue: 1 },
        { studentId: 'student-2', date: '2026-01-02', moodValue: 2 },
        { studentId: 'student-2', date: '2026-01-03', moodValue: 1 },
      ]);

      await service.detectAndCreateCases();

      expect(caseRepo.save).toHaveBeenCalledTimes(1);
      expect(caseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-2',
          triggerType: CounselorCaseTriggerType.LOW_MOOD_CHECKINS,
          triggerSummary: '3 low mood check-ins this week',
        }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
    });

    it('performs no other action beyond creating the case and sending the notification', async () => {
      observationRepo.find.mockResolvedValue([
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
      ]);

      await service.detectAndCreateCases();

      // find (dup check) + save is the only case-repo activity; no update/remove/delete calls exist on the mock at all.
      expect(caseRepo.find).not.toHaveBeenCalled();
      expect(caseRepo.findOne).toHaveBeenCalledTimes(1);
      expect(caseRepo.save).toHaveBeenCalledTimes(1);
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
    });

    it('does not create a case when the count is below threshold', async () => {
      observationRepo.find.mockResolvedValue([
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
      ]);

      await service.detectAndCreateCases();

      expect(caseRepo.save).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('does not create a duplicate case or send a second notification while an open case already exists', async () => {
      observationRepo.find.mockResolvedValue([
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
      ]);
      caseRepo.findOne.mockResolvedValue({
        id: 'existing-case',
        studentId: 'student-1',
        triggerType: CounselorCaseTriggerType.BEHAVIORAL_OBSERVATIONS,
        status: CounselorCaseStatus.OPEN,
      });

      await service.detectAndCreateCases();

      expect(caseRepo.save).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('still creates the case when no counselor account can be resolved, but sends no notification', async () => {
      userRepo.find.mockResolvedValue([]);
      observationRepo.find.mockResolvedValue([
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
        { studentId: 'student-1', createdAt: new Date() },
      ]);

      await service.detectAndCreateCases();

      expect(caseRepo.save).toHaveBeenCalledTimes(1);
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });
  });

  describe('closeCase', () => {
    it('marks the case closed and records who closed it', async () => {
      caseRepo.findOne.mockResolvedValue({
        id: 'case-1',
        status: CounselorCaseStatus.OPEN,
      });

      const result = await service.closeCase('case-1', 'staff-1');

      expect(caseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CounselorCaseStatus.CLOSED,
          closedByStaffId: 'staff-1',
        }),
      );
      expect(result.status).toBe(CounselorCaseStatus.CLOSED);
    });

    it('throws NotFoundException for an unknown case', async () => {
      caseRepo.findOne.mockResolvedValue(null);

      await expect(service.closeCase('missing', 'staff-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upsertSafetyFlagCase — MHA-133 AC #4/AI-prompt test (c)', () => {
    it('sets priority: urgent on a newly-created case, while status stays open', async () => {
      caseRepo.findOne.mockResolvedValue(null);

      const result = await service.upsertSafetyFlagCase('student-1', 'Safety flag raised in MHA session SC-1');

      expect(caseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CounselorCaseStatus.OPEN,
          priority: CounselorCasePriority.URGENT,
        }),
      );
      expect(result.status).toBe(CounselorCaseStatus.OPEN);
      expect(result.priority).toBe(CounselorCasePriority.URGENT);
    });

    it('sets priority: urgent on an existing open case being updated, without touching status', async () => {
      caseRepo.findOne.mockResolvedValue({
        id: 'case-1',
        studentId: 'student-1',
        triggerType: CounselorCaseTriggerType.MHA_SAFETY_FLAG,
        status: CounselorCaseStatus.OPEN,
        priority: CounselorCasePriority.ROUTINE,
        triggerSummary: 'old summary',
      });

      await service.upsertSafetyFlagCase('student-1', 'Safety flag raised in MHA session SC-2');

      expect(caseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CounselorCaseStatus.OPEN, priority: CounselorCasePriority.URGENT }),
      );
    });

    it('is distinct from a routine case: createCaseIfNeeded (the detection path) never sets priority, relying on the ROUTINE column default', async () => {
      observationRepo.find.mockResolvedValue([
        { studentId: 'student-3', createdAt: new Date() },
        { studentId: 'student-3', createdAt: new Date() },
        { studentId: 'student-3', createdAt: new Date() },
      ]);

      await service.detectAndCreateCases();

      const savedCase = caseRepo.save.mock.calls[0][0];
      expect(savedCase.priority).toBeUndefined();
      expect(savedCase).not.toHaveProperty('priority', CounselorCasePriority.URGENT);
    });
  });
});
