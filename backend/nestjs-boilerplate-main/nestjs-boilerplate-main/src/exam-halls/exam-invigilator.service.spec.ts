import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ExamInvigilatorService } from './exam-invigilator.service';
import { ExamEntity, ExamType } from './entities/exam.entity';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatAllocationEntity } from './entities/exam-seat-allocation.entity';
import { ExamInvigilatorEntity } from './entities/exam-invigilator.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { ExamService } from './exam.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d.map((x, i) => ({ id: `generated-${i}`, ...x })) : { id: 'generated', ...(d as object) })),
});

const EXAM_ID = 'exam-1';
const HALL_ID = 'hall-1';
const STAFF_ID = 'actor-staff-1';

function buildExam(overrides: Partial<ExamEntity> = {}): ExamEntity {
  return {
    id: EXAM_ID,
    name: 'Term Test 1',
    examType: ExamType.TERM_TEST,
    subjectId: 'subject-1',
    gradeId: 9,
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '11:00',
    academicYear: '2026',
    createdByStaffId: STAFF_ID,
    ...overrides,
  } as ExamEntity;
}

function buildHall(overrides: Partial<ExamHallEntity> = {}): ExamHallEntity {
  return { id: HALL_ID, name: 'Main Hall', capacity: 20, rowCount: 4, columnCount: 5, building: null, floor: null, ...overrides } as ExamHallEntity;
}

describe('ExamInvigilatorService', () => {
  let service: ExamInvigilatorService;
  let examRepo: MockRepo<ExamEntity>;
  let hallRepo: MockRepo<ExamHallEntity>;
  let allocationRepo: MockRepo<ExamSeatAllocationEntity>;
  let invigilatorRepo: MockRepo<ExamInvigilatorEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let examService: { assertSectionHeadCanActOnGrade: jest.Mock };
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };

  beforeEach(async () => {
    examRepo = repoMock<ExamEntity>();
    hallRepo = repoMock<ExamHallEntity>();
    allocationRepo = repoMock<ExamSeatAllocationEntity>();
    invigilatorRepo = repoMock<ExamInvigilatorEntity>();
    staffRepo = repoMock<StaffEntity>();
    examService = { assertSectionHeadCanActOnGrade: jest.fn().mockResolvedValue(undefined) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForStaff: jest.fn().mockResolvedValue(undefined) };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };

    (examRepo.findOne as jest.Mock).mockResolvedValue(buildExam());
    (hallRepo.findOne as jest.Mock).mockResolvedValue(buildHall());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamInvigilatorService,
        { provide: getRepositoryToken(ExamEntity), useValue: examRepo },
        { provide: getRepositoryToken(ExamHallEntity), useValue: hallRepo },
        { provide: getRepositoryToken(ExamSeatAllocationEntity), useValue: allocationRepo },
        { provide: getRepositoryToken(ExamInvigilatorEntity), useValue: invigilatorRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: ExamService, useValue: examService },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(ExamInvigilatorService);
  });

  describe('assignInvigilators', () => {
    it('creates rows for new staff and notifies them via all 3 channels with the correct headcount', async () => {
      (invigilatorRepo.find as jest.Mock).mockResolvedValue([]); // none already assigned
      (allocationRepo.count as jest.Mock).mockResolvedValue(18); // real headcount for this hall
      (staffRepo.find as jest.Mock).mockResolvedValue([
        { id: 'staff-a', firstName: 'Amara', lastName: 'Silva', phone: '0771111111', pushToken: 'token-a' },
        { id: 'staff-b', firstName: 'Bimal', lastName: 'Perera', phone: '0772222222', pushToken: null },
      ]);

      const result = await service.assignInvigilators(
        EXAM_ID,
        HALL_ID,
        { staffIds: ['staff-a', 'staff-b'] },
        STAFF_ID,
        true,
        false,
      );

      expect(result).toHaveLength(2);
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'assign_invigilator', targetType: 'exam', targetId: EXAM_ID }));

      expect(notificationService.createForStaff).toHaveBeenCalledTimes(2);
      expect(smsService.sendSms).toHaveBeenCalledTimes(2);
      expect(pushService.sendPush).toHaveBeenCalledTimes(1); // only staff-a has a pushToken
      expect(pushService.sendPush).toHaveBeenCalledWith('token-a', expect.any(String), expect.stringContaining('18'));
      expect(smsService.sendSms).toHaveBeenCalledWith('0771111111', expect.stringContaining('Main Hall'));
    });

    it('skips staff already assigned to this hall — no duplicate row, no duplicate notification', async () => {
      (invigilatorRepo.find as jest.Mock).mockResolvedValue([{ id: 'existing', examId: EXAM_ID, examHallId: HALL_ID, staffId: 'staff-a' }]);

      const result = await service.assignInvigilators(EXAM_ID, HALL_ID, { staffIds: ['staff-a'] }, STAFF_ID, true, false);

      expect(result).toEqual([]);
      expect(invigilatorRepo.save).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('checks section-head grade range when the caller is not fully privileged', async () => {
      (invigilatorRepo.find as jest.Mock).mockResolvedValue([]);
      (staffRepo.find as jest.Mock).mockResolvedValue([]);

      await service.assignInvigilators(EXAM_ID, HALL_ID, { staffIds: ['staff-a'] }, STAFF_ID, false, true);

      expect(examService.assertSectionHeadCanActOnGrade).toHaveBeenCalledWith(STAFF_ID, true, 9);
    });

    it('throws 404 when the exam does not exist', async () => {
      (examRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      await expect(
        service.assignInvigilators(EXAM_ID, HALL_ID, { staffIds: ['staff-a'] }, STAFF_ID, true, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 404 when the hall does not exist', async () => {
      (hallRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      await expect(
        service.assignInvigilators(EXAM_ID, HALL_ID, { staffIds: ['staff-a'] }, STAFF_ID, true, false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listInvigilators', () => {
    it('joins staff and hall names onto each assignment', async () => {
      (invigilatorRepo.find as jest.Mock).mockResolvedValue([
        { id: 'inv-1', examId: EXAM_ID, examHallId: HALL_ID, staffId: 'staff-a' },
      ]);
      (staffRepo.find as jest.Mock).mockResolvedValue([{ id: 'staff-a', firstName: 'Amara', lastName: 'Silva' }]);
      (hallRepo.find as jest.Mock).mockResolvedValue([buildHall()]);

      const rows = await service.listInvigilators(EXAM_ID);

      expect(rows).toEqual([expect.objectContaining({ staffName: 'Amara Silva', hallName: 'Main Hall' })]);
    });
  });

  describe('getDayDashboard', () => {
    it('aggregates hall/invigilator-names/allocation-count/times, excluding halls with zero allocations', async () => {
      const hall2 = buildHall({ id: 'hall-2', name: 'Annex Hall' });
      (allocationRepo.find as jest.Mock).mockResolvedValue([
        { examHallId: HALL_ID, studentId: 's1' },
        { examHallId: HALL_ID, studentId: 's2' },
        { examHallId: 'hall-2', studentId: 's3' },
      ]);
      (hallRepo.find as jest.Mock).mockResolvedValue([buildHall(), hall2]);
      (invigilatorRepo.find as jest.Mock).mockResolvedValue([
        { examId: EXAM_ID, examHallId: HALL_ID, staffId: 'staff-a' },
        { examId: EXAM_ID, examHallId: HALL_ID, staffId: 'staff-b' },
      ]);
      (staffRepo.find as jest.Mock).mockResolvedValue([
        { id: 'staff-a', firstName: 'Amara', lastName: 'Silva' },
        { id: 'staff-b', firstName: 'Bimal', lastName: 'Perera' },
      ]);

      const rows = await service.getDayDashboard(EXAM_ID);

      expect(rows).toHaveLength(2);
      const mainHallRow = rows.find((r) => r.hallId === HALL_ID)!;
      expect(mainHallRow.studentCount).toBe(2);
      expect(mainHallRow.invigilatorNames.sort()).toEqual(['Amara Silva', 'Bimal Perera']);
      expect(mainHallRow.startTime).toBe('09:00');
      expect(mainHallRow.endTime).toBe('11:00');

      const annexRow = rows.find((r) => r.hallId === 'hall-2')!;
      expect(annexRow.studentCount).toBe(1);
      expect(annexRow.invigilatorNames).toEqual([]); // no invigilator assigned to this hall yet
    });

    it('returns an empty list when the exam has no allocations at all', async () => {
      (allocationRepo.find as jest.Mock).mockResolvedValue([]);
      const rows = await service.getDayDashboard(EXAM_ID);
      expect(rows).toEqual([]);
    });
  });
});
