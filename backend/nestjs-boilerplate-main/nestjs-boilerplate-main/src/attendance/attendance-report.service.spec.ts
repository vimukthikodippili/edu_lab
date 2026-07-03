import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { AttendanceReportService } from './attendance-report.service';
import { AttendanceRecordEntity, AttendanceStatus } from './entities/attendance-record.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn(),
  findBy: jest.fn(),
  findOne: jest.fn(),
});

function makeRecord(
  studentId: string,
  status: AttendanceStatus,
  date = '2026-01-15',
): AttendanceRecordEntity {
  return {
    id: `rec-${Math.random()}`,
    studentId,
    classSectionId: 1,
    date: new Date(date + 'T00:00:00Z') as unknown as Date,
    status,
    note: null,
    markedById: 'teacher-uuid',
    overrideReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as AttendanceRecordEntity;
}

function makeStudent(id: string, first = 'Test', last = 'Student'): StudentEntity {
  return {
    id,
    firstName: first,
    lastName: last,
    admissionNumber: `ADM-${id.slice(0, 4)}`,
  } as StudentEntity;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AttendanceReportService', () => {
  let service: AttendanceReportService;
  let attendanceRepo: jest.Mocked<Repository<AttendanceRecordEntity>>;
  let studentRepo: jest.Mocked<Repository<StudentEntity>>;

  beforeEach(async () => {
    attendanceRepo = repoMock<AttendanceRecordEntity>() as any;
    studentRepo = repoMock<StudentEntity>() as any;
    const classSectionRepo = repoMock<ClassSectionEntity>() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceReportService,
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
      ],
    }).compile();

    service = module.get<AttendanceReportService>(AttendanceReportService);
    jest.clearAllMocks();
  });

  const baseDto = {
    classSectionId: 1,
    startDate: '2026-01-01',
    endDate: '2026-06-30',
  };

  // ── 1. Correct aggregation ────────────────────────────────────────────────

  it('correctly aggregates 5 present + 3 absent + 2 late → total=10, rate=70', async () => {
    const sid = 'student-001';
    const records = [
      ...Array.from({ length: 5 }, () => makeRecord(sid, AttendanceStatus.PRESENT)),
      ...Array.from({ length: 3 }, () => makeRecord(sid, AttendanceStatus.ABSENT)),
      ...Array.from({ length: 2 }, () => makeRecord(sid, AttendanceStatus.LATE)),
    ];

    attendanceRepo.find.mockResolvedValue(records);
    studentRepo.findBy.mockResolvedValue([makeStudent(sid)]);

    const result = await service.generateReport(baseDto);

    expect(result.summary.present).toBe(5);
    expect(result.summary.absent).toBe(3);
    expect(result.summary.late).toBe(2);
    expect(result.summary.total).toBe(10);
    // attendanceRate = (present + late) / total * 100 = (5+2)/10*100 = 70
    expect(result.summary.attendanceRate).toBe(70);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].present).toBe(5);
    expect(result.rows[0].absent).toBe(3);
    expect(result.rows[0].late).toBe(2);
    expect(result.rows[0].attendanceRate).toBe(70);
  });

  // ── 2. Date range filter enforced ────────────────────────────────────────

  it('respects date range: records outside range not counted (mock returns only in-range records)', async () => {
    const sid = 'student-002';
    // The repository already filters by date (Between in the service).
    // We simulate TypeORM returning only 3 records within the range.
    const inRangeRecords = Array.from({ length: 3 }, () =>
      makeRecord(sid, AttendanceStatus.PRESENT, '2026-03-01'),
    );

    attendanceRepo.find.mockResolvedValue(inRangeRecords);
    studentRepo.findBy.mockResolvedValue([makeStudent(sid)]);

    const result = await service.generateReport({
      classSectionId: 1,
      startDate: '2026-02-01',
      endDate: '2026-04-30',
    });

    expect(result.summary.total).toBe(3);
    expect(result.summary.present).toBe(3);
    expect(result.rows[0].total).toBe(3);
  });

  // ── 3. Multiple students ────────────────────────────────────────────────

  it('aggregates correctly for multiple students', async () => {
    const sid1 = 'student-aaa';
    const sid2 = 'student-bbb';
    const records = [
      ...Array.from({ length: 8 }, () => makeRecord(sid1, AttendanceStatus.PRESENT)),
      ...Array.from({ length: 2 }, () => makeRecord(sid1, AttendanceStatus.ABSENT)),
      ...Array.from({ length: 5 }, () => makeRecord(sid2, AttendanceStatus.PRESENT)),
      ...Array.from({ length: 5 }, () => makeRecord(sid2, AttendanceStatus.ABSENT)),
    ];

    attendanceRepo.find.mockResolvedValue(records);
    studentRepo.findBy.mockResolvedValue([
      makeStudent(sid1, 'Alpha', 'Student'),
      makeStudent(sid2, 'Beta', 'Student'),
    ]);

    const result = await service.generateReport(baseDto);

    expect(result.rows).toHaveLength(2);

    const alpha = result.rows.find((r) => r.studentId === sid1)!;
    expect(alpha.present).toBe(8);
    expect(alpha.absent).toBe(2);
    expect(alpha.total).toBe(10);
    expect(alpha.attendanceRate).toBe(80); // 8/10

    const beta = result.rows.find((r) => r.studentId === sid2)!;
    expect(beta.present).toBe(5);
    expect(beta.absent).toBe(5);
    expect(beta.total).toBe(10);
    expect(beta.attendanceRate).toBe(50); // 5/10
  });

  // ── 4. attendanceRate rounds correctly ───────────────────────────────────

  it('rounds attendanceRate (7 of 10 → 70, not 70.0)', async () => {
    const sid = 'student-003';
    const records = [
      ...Array.from({ length: 7 }, () => makeRecord(sid, AttendanceStatus.PRESENT)),
      ...Array.from({ length: 3 }, () => makeRecord(sid, AttendanceStatus.ABSENT)),
    ];

    attendanceRepo.find.mockResolvedValue(records);
    studentRepo.findBy.mockResolvedValue([makeStudent(sid)]);

    const result = await service.generateReport(baseDto);

    expect(Number.isInteger(result.rows[0].attendanceRate)).toBe(true);
    expect(result.rows[0].attendanceRate).toBe(70);
    expect(Number.isInteger(result.summary.attendanceRate)).toBe(true);
  });

  // ── 5. Empty result set ──────────────────────────────────────────────────

  it('returns zeros and empty rows when no records exist in range', async () => {
    attendanceRepo.find.mockResolvedValue([]);
    studentRepo.findBy.mockResolvedValue([]);

    const result = await service.generateReport(baseDto);

    expect(result.rows).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.present).toBe(0);
    expect(result.summary.absent).toBe(0);
    expect(result.summary.attendanceRate).toBe(0);
    expect(result.generatedAt).toBeTruthy();
  });

  // ── 6. Missing filter guard ──────────────────────────────────────────────

  it('throws BadRequestException when neither classSectionId nor studentId is provided', async () => {
    await expect(
      service.generateReport({
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(attendanceRepo.find).not.toHaveBeenCalled();
  });
});
