import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { ExamSeatAllocationService } from './exam-seat-allocation.service';
import { ExamEntity, ExamType } from './entities/exam.entity';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatEntity } from './entities/exam-seat.entity';
import { ExamSeatAllocationEntity } from './entities/exam-seat-allocation.entity';
import { AdmitCardEntity } from './entities/admit-card.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
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
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const EXAM_ID = 'exam-1';
const STAFF_ID = 'staff-1';
const SUBJECT_ID = 'subject-1';

function buildExam(overrides: Partial<ExamEntity> = {}): ExamEntity {
  return {
    id: EXAM_ID,
    name: 'O/L Sinhala',
    examType: ExamType.O_LEVEL,
    subjectId: SUBJECT_ID,
    gradeId: 11,
    date: '2026-12-05',
    startTime: '08:30',
    endTime: '11:30',
    academicYear: '2026',
    createdByStaffId: STAFF_ID,
    ...overrides,
  } as ExamEntity;
}

function buildHall(overrides: Partial<ExamHallEntity> = {}): ExamHallEntity {
  return { id: 'hall-1', name: 'Hall A', building: null, floor: null, capacity: 2, rowCount: 1, columnCount: 2, ...overrides } as ExamHallEntity;
}

function buildSeat(overrides: Partial<ExamSeatEntity> = {}): ExamSeatEntity {
  return { id: 'seat-1', examHallId: 'hall-1', seatLabel: 'A1', rowNumber: 1, columnNumber: 1, ...overrides } as ExamSeatEntity;
}

function buildStudent(overrides: Partial<StudentEntity> = {}): StudentEntity {
  return {
    id: 'student-1',
    firstName: 'Nimal',
    lastName: 'Perera',
    gradeId: 11,
    classSectionId: 1,
    status: StudentStatus.ACTIVE,
    studentGuardians: [],
    ...overrides,
  } as unknown as StudentEntity;
}

describe('ExamSeatAllocationService', () => {
  let service: ExamSeatAllocationService;
  let examRepo: MockRepo<ExamEntity>;
  let hallRepo: MockRepo<ExamHallEntity>;
  let seatRepo: MockRepo<ExamSeatEntity>;
  let allocationRepo: MockRepo<ExamSeatAllocationEntity>;
  let admitCardRepo: MockRepo<AdmitCardEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let examService: { assertSectionHeadCanActOnGrade: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let auditService: { log: jest.Mock };
  let notificationService: { createForStudent: jest.Mock; createForGuardian: jest.Mock };
  let smsService: { sendSms: jest.Mock };
  let pushService: { sendPush: jest.Mock };

  function buildManagerMock() {
    return {
      create: jest.fn((_entityClass: unknown, data: unknown) => data),
      save: jest.fn((_entityClass: unknown, data: unknown) => {
        if (Array.isArray(data)) {
          return Promise.resolve(data.map((d, i) => ({ id: `generated-${i}`, ...(d as object) })));
        }
        return Promise.resolve({ id: 'generated', ...(data as object) });
      }),
    };
  }

  beforeEach(async () => {
    examRepo = repoMock<ExamEntity>();
    hallRepo = repoMock<ExamHallEntity>();
    seatRepo = repoMock<ExamSeatEntity>();
    allocationRepo = repoMock<ExamSeatAllocationEntity>();
    admitCardRepo = repoMock<AdmitCardEntity>();
    studentRepo = repoMock<StudentEntity>();
    examService = { assertSectionHeadCanActOnGrade: jest.fn().mockResolvedValue(undefined) };
    dataSource = { transaction: jest.fn((cb) => cb(buildManagerMock())) };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForStudent: jest.fn().mockResolvedValue(undefined), createForGuardian: jest.fn().mockResolvedValue(undefined) };
    smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    pushService = { sendPush: jest.fn().mockResolvedValue(undefined) };

    (examRepo.findOne as jest.Mock).mockResolvedValue(buildExam());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamSeatAllocationService,
        { provide: getRepositoryToken(ExamEntity), useValue: examRepo },
        { provide: getRepositoryToken(ExamHallEntity), useValue: hallRepo },
        { provide: getRepositoryToken(ExamSeatEntity), useValue: seatRepo },
        { provide: getRepositoryToken(ExamSeatAllocationEntity), useValue: allocationRepo },
        { provide: getRepositoryToken(AdmitCardEntity), useValue: admitCardRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: ExamService, useValue: examService },
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: SmsService, useValue: smsService },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(ExamSeatAllocationService);
  });

  describe('autoAllocate — filling order (AI-prompt test)', () => {
    it('fills hall 1 to capacity before any student lands in hall 2', async () => {
      const hall1 = buildHall({ id: 'hall-1', name: 'Hall A', capacity: 2, rowCount: 1, columnCount: 2 });
      const hall2 = buildHall({ id: 'hall-2', name: 'Hall B', capacity: 3, rowCount: 1, columnCount: 3 });
      (hallRepo.find as jest.Mock).mockResolvedValue([hall1, hall2]);
      (examRepo.find as jest.Mock).mockResolvedValue([]); // no same-day conflicts

      const seatsHall1 = [buildSeat({ id: 's1a', examHallId: 'hall-1', seatLabel: 'A1', columnNumber: 1 }), buildSeat({ id: 's1b', examHallId: 'hall-1', seatLabel: 'A2', columnNumber: 2 })];
      const seatsHall2 = [buildSeat({ id: 's2a', examHallId: 'hall-2', seatLabel: 'A1', columnNumber: 1 }), buildSeat({ id: 's2b', examHallId: 'hall-2', seatLabel: 'A2', columnNumber: 2 }), buildSeat({ id: 's2c', examHallId: 'hall-2', seatLabel: 'A3', columnNumber: 3 })];
      (seatRepo.find as jest.Mock).mockImplementation(({ where }: { where: { examHallId: string } }) =>
        Promise.resolve(where.examHallId === 'hall-1' ? seatsHall1 : seatsHall2),
      );

      const students = [buildStudent({ id: 's1' }), buildStudent({ id: 's2' }), buildStudent({ id: 's3' }), buildStudent({ id: 's4' })];
      (studentRepo.find as jest.Mock).mockResolvedValue(students);

      let savedAllocations: any[] = [];
      dataSource.transaction = jest.fn(async (cb) => {
        const manager = {
          create: jest.fn((_entityClass: unknown, data: unknown) => data),
          save: jest.fn((_entityClass: unknown, data: unknown) => {
            if (Array.isArray(data)) {
              const withIds = data.map((d, i) => ({ id: `alloc-${i}`, ...(d as object) }));
              if ((data[0] as any)?.examSeatId) savedAllocations = withIds;
              return Promise.resolve(withIds);
            }
            return Promise.resolve({ id: 'generated', ...(data as object) });
          }),
        };
        return cb(manager);
      });

      const result = await service.autoAllocate(EXAM_ID, { mixClasses: false }, STAFF_ID, true, false);

      expect(result.allocatedCount).toBe(4);
      expect(result.hallsUsed).toBe(2);
      const hall1Count = savedAllocations.filter((a) => a.examHallId === 'hall-1').length;
      const hall2Count = savedAllocations.filter((a) => a.examHallId === 'hall-2').length;
      expect(hall1Count).toBe(2); // hall 1's full capacity used first
      expect(hall2Count).toBe(2); // only the 2 remaining students spill into hall 2 (not all 3 of its seats)
    });
  });

  describe('autoAllocate — special-needs front-row placement (AI-prompt test)', () => {
    it('places every special-needs student in the front row before any regular student', async () => {
      const hall = buildHall({ id: 'hall-1', name: 'Hall A', capacity: 6, rowCount: 2, columnCount: 3 });
      (hallRepo.find as jest.Mock).mockResolvedValue([hall]);
      (examRepo.find as jest.Mock).mockResolvedValue([]);

      const seats = [
        buildSeat({ id: 'a1', examHallId: 'hall-1', seatLabel: 'A1', rowNumber: 1, columnNumber: 1 }),
        buildSeat({ id: 'a2', examHallId: 'hall-1', seatLabel: 'A2', rowNumber: 1, columnNumber: 2 }),
        buildSeat({ id: 'a3', examHallId: 'hall-1', seatLabel: 'A3', rowNumber: 1, columnNumber: 3 }),
        buildSeat({ id: 'b1', examHallId: 'hall-1', seatLabel: 'B1', rowNumber: 2, columnNumber: 1 }),
        buildSeat({ id: 'b2', examHallId: 'hall-1', seatLabel: 'B2', rowNumber: 2, columnNumber: 2 }),
        buildSeat({ id: 'b3', examHallId: 'hall-1', seatLabel: 'B3', rowNumber: 2, columnNumber: 3 }),
      ];
      (seatRepo.find as jest.Mock).mockResolvedValue(seats);

      const students = [
        buildStudent({ id: 'special-1' }),
        buildStudent({ id: 'special-2' }),
        buildStudent({ id: 'reg-1' }),
        buildStudent({ id: 'reg-2' }),
        buildStudent({ id: 'reg-3' }),
        buildStudent({ id: 'reg-4' }),
      ];
      (studentRepo.find as jest.Mock).mockResolvedValue(students);

      let savedAllocations: any[] = [];
      dataSource.transaction = jest.fn(async (cb) => {
        const manager = {
          create: jest.fn((_entityClass: unknown, data: unknown) => data),
          save: jest.fn((_entityClass: unknown, data: unknown) => {
            if (Array.isArray(data)) {
              const withIds = data.map((d, i) => ({ id: `alloc-${i}`, ...(d as object) }));
              if ((data[0] as any)?.examSeatId) savedAllocations = withIds;
              return Promise.resolve(withIds);
            }
            return Promise.resolve({ id: 'generated', ...(data as object) });
          }),
        };
        return cb(manager);
      });

      const result = await service.autoAllocate(
        EXAM_ID,
        { mixClasses: false, specialNeedsStudentIds: ['special-1', 'special-2'] },
        STAFF_ID,
        true,
        false,
      );

      expect(result.specialNeedsPlaced).toBe(2);
      const specialAllocations = savedAllocations.filter((a) => a.specialNeeds);
      expect(specialAllocations).toHaveLength(2);
      for (const alloc of specialAllocations) {
        const seat = seats.find((s) => s.id === alloc.examSeatId);
        expect(seat?.rowNumber).toBe(1);
      }
    });
  });

  describe('autoAllocate — class-mixing interleave (AI-prompt test)', () => {
    it('interleaves students from different class sections when mixClasses=true', async () => {
      const hall = buildHall({ id: 'hall-1', name: 'Hall A', capacity: 6, rowCount: 1, columnCount: 6 });
      (hallRepo.find as jest.Mock).mockResolvedValue([hall]);
      (examRepo.find as jest.Mock).mockResolvedValue([]);
      const seats = Array.from({ length: 6 }, (_, i) => buildSeat({ id: `seat-${i}`, examHallId: 'hall-1', seatLabel: `A${i + 1}`, rowNumber: 1, columnNumber: i + 1 }));
      (seatRepo.find as jest.Mock).mockResolvedValue(seats);

      // sorted by classSectionId ASC as the real query would return
      const students = [
        buildStudent({ id: 'c1-a', classSectionId: 1 }),
        buildStudent({ id: 'c1-b', classSectionId: 1 }),
        buildStudent({ id: 'c2-a', classSectionId: 2 }),
        buildStudent({ id: 'c2-b', classSectionId: 2 }),
        buildStudent({ id: 'c3-a', classSectionId: 3 }),
        buildStudent({ id: 'c3-b', classSectionId: 3 }),
      ];
      (studentRepo.find as jest.Mock).mockResolvedValue(students);

      let savedAllocations: any[] = [];
      dataSource.transaction = jest.fn(async (cb) => {
        const manager = {
          create: jest.fn((_entityClass: unknown, data: unknown) => data),
          save: jest.fn((_entityClass: unknown, data: unknown) => {
            if (Array.isArray(data)) {
              const withIds = data.map((d, i) => ({ id: `alloc-${i}`, ...(d as object) }));
              if ((data[0] as any)?.examSeatId) savedAllocations = withIds;
              return Promise.resolve(withIds);
            }
            return Promise.resolve({ id: 'generated', ...(data as object) });
          }),
        };
        return cb(manager);
      });

      await service.autoAllocate(EXAM_ID, { mixClasses: true }, STAFF_ID, true, false);

      const studentById = new Map(students.map((s) => [s.id, s]));
      const orderedClassSections = savedAllocations
        .sort((a, b) => seats.findIndex((s) => s.id === a.examSeatId) - seats.findIndex((s) => s.id === b.examSeatId))
        .map((a) => studentById.get(a.studentId)!.classSectionId);

      // consecutive seats should never share the same classSectionId when alternatives exist
      for (let i = 1; i < orderedClassSections.length; i++) {
        expect(orderedClassSections[i]).not.toBe(orderedClassSections[i - 1]);
      }
    });

    it('keeps students grouped by class when mixClasses=false', async () => {
      const hall = buildHall({ id: 'hall-1', name: 'Hall A', capacity: 4, rowCount: 1, columnCount: 4 });
      (hallRepo.find as jest.Mock).mockResolvedValue([hall]);
      (examRepo.find as jest.Mock).mockResolvedValue([]);
      const seats = Array.from({ length: 4 }, (_, i) => buildSeat({ id: `seat-${i}`, examHallId: 'hall-1', seatLabel: `A${i + 1}`, rowNumber: 1, columnNumber: i + 1 }));
      (seatRepo.find as jest.Mock).mockResolvedValue(seats);

      const students = [
        buildStudent({ id: 'c1-a', classSectionId: 1 }),
        buildStudent({ id: 'c1-b', classSectionId: 1 }),
        buildStudent({ id: 'c2-a', classSectionId: 2 }),
        buildStudent({ id: 'c2-b', classSectionId: 2 }),
      ];
      (studentRepo.find as jest.Mock).mockResolvedValue(students);

      let savedAllocations: any[] = [];
      dataSource.transaction = jest.fn(async (cb) => {
        const manager = {
          create: jest.fn((_entityClass: unknown, data: unknown) => data),
          save: jest.fn((_entityClass: unknown, data: unknown) => {
            if (Array.isArray(data)) {
              const withIds = data.map((d, i) => ({ id: `alloc-${i}`, ...(d as object) }));
              if ((data[0] as any)?.examSeatId) savedAllocations = withIds;
              return Promise.resolve(withIds);
            }
            return Promise.resolve({ id: 'generated', ...(data as object) });
          }),
        };
        return cb(manager);
      });

      await service.autoAllocate(EXAM_ID, { mixClasses: false }, STAFF_ID, true, false);

      const studentById = new Map(students.map((s) => [s.id, s]));
      const orderedClassSections = savedAllocations
        .sort((a, b) => seats.findIndex((s) => s.id === a.examSeatId) - seats.findIndex((s) => s.id === b.examSeatId))
        .map((a) => studentById.get(a.studentId)!.classSectionId);

      expect(orderedClassSections).toEqual([1, 1, 2, 2]);
    });
  });

  describe('autoAllocate — guards', () => {
    it('throws 422 when candidates exceed total available seat capacity', async () => {
      (hallRepo.find as jest.Mock).mockResolvedValue([buildHall({ capacity: 1, rowCount: 1, columnCount: 1 })]);
      (examRepo.find as jest.Mock).mockResolvedValue([]);
      const students = [buildStudent({ id: 's1' }), buildStudent({ id: 's2' })];
      (studentRepo.find as jest.Mock).mockResolvedValue(students);

      await expect(service.autoAllocate(EXAM_ID, { mixClasses: false }, STAFF_ID, true, false)).rejects.toThrow(UnprocessableEntityException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws 409 when the exam has already been allocated', async () => {
      (allocationRepo.count as jest.Mock).mockResolvedValue(3);
      await expect(service.autoAllocate(EXAM_ID, { mixClasses: false }, STAFF_ID, true, false)).rejects.toThrow(ConflictException);
    });

    it('throws 404 when the exam does not exist', async () => {
      (examRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      await expect(service.autoAllocate(EXAM_ID, { mixClasses: false }, STAFF_ID, true, false)).rejects.toThrow(NotFoundException);
    });

    it('checks section-head grade range when the caller is not fully privileged', async () => {
      (hallRepo.find as jest.Mock).mockResolvedValue([]);
      await service.autoAllocate(EXAM_ID, { mixClasses: false }, STAFF_ID, false, true);
      expect(examService.assertSectionHeadCanActOnGrade).toHaveBeenCalledWith(STAFF_ID, true, 11);
    });
  });

  describe('overrideSeat', () => {
    it('rejects reassigning onto a seat already taken by a different allocation', async () => {
      (allocationRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 'alloc-1', examId: EXAM_ID, examSeatId: 'seat-old', examHallId: 'hall-1', studentId: 's1' })
        .mockResolvedValueOnce({ id: 'alloc-2', examId: EXAM_ID, examSeatId: 'seat-new' }); // conflict: different allocation already on that seat
      (seatRepo.findOne as jest.Mock).mockResolvedValue(buildSeat({ id: 'seat-new', examHallId: 'hall-2' }));

      await expect(
        service.overrideSeat(EXAM_ID, 'alloc-1', { examSeatId: 'seat-new' }, STAFF_ID, true, false),
      ).rejects.toThrow(ConflictException);
    });

    it('reassigns the seat when it is free', async () => {
      (allocationRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ id: 'alloc-1', examId: EXAM_ID, examSeatId: 'seat-old', examHallId: 'hall-1', studentId: 's1' })
        .mockResolvedValueOnce(undefined); // no conflict
      (seatRepo.findOne as jest.Mock).mockResolvedValue(buildSeat({ id: 'seat-new', examHallId: 'hall-2' }));
      (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent({ id: 's1' })]);

      const result = await service.overrideSeat(EXAM_ID, 'alloc-1', { examSeatId: 'seat-new' }, STAFF_ID, true, false);

      expect(result).toEqual(expect.objectContaining({ examSeatId: 'seat-new', examHallId: 'hall-2' }));
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'manual_override' }));
    });
  });

  describe('getMyAdmitCard / getChildAdmitCard', () => {
    it('throws 404 when the student has no allocation for this exam', async () => {
      (allocationRepo.findOne as jest.Mock).mockResolvedValue(undefined);
      await expect(service.getMyAdmitCard(EXAM_ID, 'student-1')).rejects.toThrow(NotFoundException);
    });

    it("throws 404 when the student isn't linked to the calling guardian", async () => {
      (studentRepo.findOne as jest.Mock).mockResolvedValue({ id: 'student-1', studentGuardians: [{ guardianId: 'someone-else' }] });
      await expect(service.getChildAdmitCard(EXAM_ID, 'student-1', 'guardian-1')).rejects.toThrow(NotFoundException);
    });

    it('returns the admit card view when the allocation and admit card exist', async () => {
      (allocationRepo.findOne as jest.Mock).mockResolvedValue({ id: 'alloc-1', examId: EXAM_ID, studentId: 'student-1', examHallId: 'hall-1', examSeatId: 'seat-1' });
      (admitCardRepo.findOne as jest.Mock).mockResolvedValue({ id: 'card-1', examSeatAllocationId: 'alloc-1', generatedAt: new Date() });
      (hallRepo.findOne as jest.Mock).mockResolvedValue(buildHall());
      (seatRepo.findOne as jest.Mock).mockResolvedValue(buildSeat());

      const view = await service.getMyAdmitCard(EXAM_ID, 'student-1');

      expect(view.hallName).toBe('Hall A');
      expect(view.seatLabel).toBe('A1');
    });
  });
});
