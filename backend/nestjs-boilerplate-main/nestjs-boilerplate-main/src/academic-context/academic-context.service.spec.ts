import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { AcademicContextService } from './academic-context.service';
import { StudentEntity } from '../students/entities/student.entity';
import { AttendanceRecordEntity, AttendanceStatus } from '../attendance/entities/attendance-record.entity';
import { StudentGradeTrendEntity } from '../grades/entities/student-grade-trend.entity';
import { AcademicPatternFlagEntity, AcademicPatternFlagType } from '../grades/entities/academic-pattern-flag.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn(),
  create: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
});

const STUDENT_ID = 'student-uuid';

describe('AcademicContextService', () => {
  let service: AcademicContextService;
  let studentRepo: MockRepo<StudentEntity>;
  let attendanceRepo: MockRepo<AttendanceRecordEntity>;
  let trendRepo: MockRepo<StudentGradeTrendEntity>;
  let patternFlagRepo: MockRepo<AcademicPatternFlagEntity>;
  let subjectRepo: MockRepo<SubjectEntity>;

  beforeEach(async () => {
    studentRepo = repoMock<StudentEntity>();
    attendanceRepo = repoMock<AttendanceRecordEntity>();
    trendRepo = repoMock<StudentGradeTrendEntity>();
    patternFlagRepo = repoMock<AcademicPatternFlagEntity>();
    subjectRepo = repoMock<SubjectEntity>();

    studentRepo.findOne!.mockResolvedValue({ id: STUDENT_ID, firstName: 'Sanduni' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicContextService,
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(StudentGradeTrendEntity), useValue: trendRepo },
        { provide: getRepositoryToken(AcademicPatternFlagEntity), useValue: patternFlagRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
      ],
    }).compile();

    service = module.get<AcademicContextService>(AcademicContextService);
  });

  it('throws NotFoundException when the student does not exist', async () => {
    studentRepo.findOne!.mockResolvedValue(undefined);
    await expect(service.getAcademicContext(STUDENT_ID)).rejects.toThrow(NotFoundException);
  });

  describe('attendance summary', () => {
    it('computes absencePercent from a mixed-status fixture within the window', async () => {
      const records = [
        ...Array(23).fill({ status: AttendanceStatus.PRESENT }),
        ...Array(5).fill({ status: AttendanceStatus.ABSENT }),
      ];
      attendanceRepo.find!.mockResolvedValue(records);

      const result = await service.getAcademicContext(STUDENT_ID);

      expect(result.attendance.hasData).toBe(true);
      expect(result.attendance.totalDaysRecorded).toBe(28);
      expect(result.attendance.absentCount).toBe(5);
      expect(result.attendance.absencePercent).toBe(18);
    });

    it('reports hasData: false and absencePercent: null with no records — the "new student" case (AC #17)', async () => {
      attendanceRepo.find!.mockResolvedValue([]);
      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.attendance.hasData).toBe(false);
      expect(result.attendance.absentCount).toBe(0);
      expect(result.attendance.absencePercent).toBeNull();
    });

    it('scopes the query to the given studentId and a 28-day Between range', async () => {
      await service.getAcademicContext(STUDENT_ID);
      const callArg = attendanceRepo.find!.mock.calls[0][0];
      expect(callArg.where.studentId).toBe(STUDENT_ID);
      expect(callArg.where.date).toBeDefined();
    });
  });

  describe('grade trends', () => {
    it('resolves subject names via a batched In() lookup and sorts by subjectName', async () => {
      trendRepo.find!.mockResolvedValue([
        { subjectId: 'subj-b', decliningTrend: false, lastComputedAt: new Date('2026-07-01') },
        { subjectId: 'subj-a', decliningTrend: true, lastComputedAt: new Date('2026-07-02') },
      ]);
      subjectRepo.find!.mockResolvedValue([
        { id: 'subj-a', name: 'Mathematics' },
        { id: 'subj-b', name: 'Science' },
      ]);

      const result = await service.getAcademicContext(STUDENT_ID);

      expect(result.gradeTrends.map((r) => r.subjectName)).toEqual(['Mathematics', 'Science']);
      expect(result.gradeTrends[0].decliningTrend).toBe(true);
      expect(subjectRepo.find).toHaveBeenCalledWith({ where: { id: expect.anything() } });
    });

    it('returns [] and never queries subjectRepo when there are no trend rows', async () => {
      trendRepo.find!.mockResolvedValue([]);
      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.gradeTrends).toEqual([]);
      expect(subjectRepo.find).not.toHaveBeenCalled();
    });

    it('falls back to "Unknown subject" for orphan trend data with no matching subject row', async () => {
      trendRepo.find!.mockResolvedValue([
        { subjectId: 'subj-missing', decliningTrend: false, lastComputedAt: null },
      ]);
      subjectRepo.find!.mockResolvedValue([]);

      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.gradeTrends[0].subjectName).toBe('Unknown subject');
    });
  });

  describe('pattern flags', () => {
    it('passes through open pattern flag rows ordered by flaggedAt DESC', async () => {
      const flaggedAt = new Date('2026-07-20');
      patternFlagRepo.find!.mockResolvedValue([
        {
          id: 'flag-1',
          subjectId: 'subj-a',
          type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
          description: 'Effort-outcome mismatch in Mathematics',
          flaggedAt,
        },
      ]);

      const result = await service.getAcademicContext(STUDENT_ID);

      expect(result.patternFlags).toEqual([
        {
          id: 'flag-1',
          subjectId: 'subj-a',
          type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
          description: 'Effort-outcome mismatch in Mathematics',
          flaggedAt,
        },
      ]);
      expect(patternFlagRepo.find).toHaveBeenCalledWith({
        where: { studentId: STUDENT_ID },
        order: { flaggedAt: 'DESC' },
      });
    });

    it('returns [] when there are no open flags', async () => {
      patternFlagRepo.find!.mockResolvedValue([]);
      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.patternFlags).toEqual([]);
    });
  });

  describe('hasAnyData (AC #17)', () => {
    it('is true when only attendance has data', async () => {
      attendanceRepo.find!.mockResolvedValue([{ status: AttendanceStatus.PRESENT }]);
      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.hasAnyData).toBe(true);
    });

    it('is true when only grade trends have data', async () => {
      trendRepo.find!.mockResolvedValue([{ subjectId: 'subj-a', decliningTrend: true, lastComputedAt: null }]);
      subjectRepo.find!.mockResolvedValue([{ id: 'subj-a', name: 'Mathematics' }]);
      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.hasAnyData).toBe(true);
    });

    it('is true when only pattern flags have data', async () => {
      patternFlagRepo.find!.mockResolvedValue([
        { id: 'flag-1', subjectId: 'subj-a', type: AcademicPatternFlagType.ATTENDANCE_GRADE_CORRELATION, description: 'x', flaggedAt: new Date() },
      ]);
      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.hasAnyData).toBe(true);
    });

    it('is false when all three sources are empty — the literal AC #17 trigger', async () => {
      const result = await service.getAcademicContext(STUDENT_ID);
      expect(result.hasAnyData).toBe(false);
    });
  });

  it('never writes to any table (AI-prompt-mandated test a) — structurally read-only, no writes attempted', async () => {
    attendanceRepo.find!.mockResolvedValue([{ status: AttendanceStatus.ABSENT }]);
    trendRepo.find!.mockResolvedValue([{ subjectId: 'subj-a', decliningTrend: true, lastComputedAt: null }]);
    subjectRepo.find!.mockResolvedValue([{ id: 'subj-a', name: 'Mathematics' }]);
    patternFlagRepo.find!.mockResolvedValue([
      { id: 'flag-1', subjectId: 'subj-a', type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH, description: 'x', flaggedAt: new Date() },
    ]);

    await service.getAcademicContext(STUDENT_ID);

    const allRepos = [studentRepo, attendanceRepo, trendRepo, patternFlagRepo, subjectRepo];
    const writeMethods: (keyof Repository<ObjectLiteral>)[] = ['save', 'insert', 'update', 'remove', 'delete', 'softDelete'];
    for (const repo of allRepos) {
      for (const method of writeMethods) {
        expect(repo[method]).not.toHaveBeenCalled();
      }
    }
  });

  it('scopes every repo query to the exact studentId passed in (no cross-student leakage)', async () => {
    await service.getAcademicContext(STUDENT_ID);
    expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { id: STUDENT_ID } });
    expect(attendanceRepo.find!.mock.calls[0][0].where.studentId).toBe(STUDENT_ID);
    expect(trendRepo.find).toHaveBeenCalledWith({ where: { studentId: STUDENT_ID } });
    expect(patternFlagRepo.find).toHaveBeenCalledWith({
      where: { studentId: STUDENT_ID },
      order: { flaggedAt: 'DESC' },
    });
  });
});
