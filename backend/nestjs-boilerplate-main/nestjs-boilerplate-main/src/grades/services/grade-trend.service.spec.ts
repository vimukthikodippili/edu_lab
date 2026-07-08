import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import {
  GradeTrendService,
  FORBIDDEN_CLINICAL_TERMS,
  buildPatternDescription,
  buildEffortOutcomeMismatchMessage,
} from './grade-trend.service';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { AcademicTermEntity } from '../entities/academic-term.entity';
import { StudentGradeTrendEntity } from '../entities/student-grade-trend.entity';
import {
  AcademicPatternFlagEntity,
  AcademicPatternFlagType,
} from '../entities/academic-pattern-flag.entity';
import { StudentEntity, StudentStatus } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { AttendanceRecordEntity, AttendanceStatus } from '../../attendance/entities/attendance-record.entity';
import { NotificationService } from '../../notification/notification.service';

const staffId = 'teacher-uuid';
const studentId = 'student-uuid';
const subjectId = 'subject-uuid';
const classSectionId = 1;

describe('GradeTrendService', () => {
  let service: GradeTrendService;

  let markRepo: { find: jest.Mock };
  let assessmentRepo: { find: jest.Mock };
  let termRepo: { find: jest.Mock };
  let trendRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let studentRepo: { find: jest.Mock };
  let requirementRepo: { findOne: jest.Mock; find: jest.Mock };
  let subjectRepo: { find: jest.Mock };
  let attendanceRepo: { find: jest.Mock };
  let patternFlagRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let configService: { get: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };

  beforeEach(async () => {
    markRepo = { find: jest.fn().mockResolvedValue([]) };
    assessmentRepo = { find: jest.fn().mockResolvedValue([]) };
    termRepo = { find: jest.fn().mockResolvedValue([]) };
    trendRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (rows) => rows),
    };
    studentRepo = { find: jest.fn().mockResolvedValue([]) };
    requirementRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    subjectRepo = { find: jest.fn().mockResolvedValue([]) };
    attendanceRepo = { find: jest.fn().mockResolvedValue([]) };
    patternFlagRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn(async (row) => row),
      remove: jest.fn(async (row) => row),
    };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const map: Record<string, unknown> = {
          'gradeTrend.windowSize': 3,
          'gradeTrend.dropThreshold': 5,
          'gradeTrend.attendanceDropThreshold': 15,
        };
        return map[key];
      }),
    };
    // Only createForStaff is implemented — if the service ever tried a guardian/student
    // notification path, calling it here would throw "not a function" and fail the test.
    notificationService = { createForStaff: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeTrendService,
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(AcademicTermEntity), useValue: termRepo },
        { provide: getRepositoryToken(StudentGradeTrendEntity), useValue: trendRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(AcademicPatternFlagEntity), useValue: patternFlagRepo },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<GradeTrendService>(GradeTrendService);
  });

  describe('computeRollingAverages', () => {
    it('computes correct averages for a known sequence', () => {
      const result = service.computeRollingAverages([90, 80, 70, 60], 3);
      expect(result).toEqual([(90 + 80 + 70) / 3, (80 + 70 + 60) / 3]);
    });

    it('returns [] when fewer scores than windowSize', () => {
      expect(service.computeRollingAverages([90, 80], 3)).toEqual([]);
    });
  });

  describe('isDecliningTrend', () => {
    it('returns true for two consecutive drops each beyond the threshold', () => {
      // rolling averages: 90 -> 80 (drop 10) -> 70 (drop 10), threshold 5
      expect(service.isDecliningTrend([90, 80, 70], 5)).toBe(true);
    });

    it('returns false for a stable/improving sequence', () => {
      expect(service.isDecliningTrend([70, 75, 80], 5)).toBe(false);
    });

    it('returns false for a single blip (one drop, then recovery)', () => {
      // 90 -> 70 (drop 20) -> 85 (rise) — only one drop, not a trend
      expect(service.isDecliningTrend([90, 70, 85], 5)).toBe(false);
    });

    it('returns false when fewer than 3 rolling-average points exist', () => {
      expect(service.isDecliningTrend([90, 70], 5)).toBe(false);
    });
  });

  describe('getClassSubjectTrends', () => {
    it('throws ForbiddenException when the teacher has no matching requirement and is not privileged', async () => {
      requirementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getClassSubjectTrends(classSectionId, subjectId, staffId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns the persisted decliningTrend flag alongside a correctly-ordered score series', async () => {
      requirementRepo.findOne.mockResolvedValue({ teacherId: staffId, subjectId, classSectionId });
      studentRepo.find.mockResolvedValue([
        { id: studentId, firstName: 'Ama', lastName: 'Silva', admissionNumber: 'SIMS/2026/001', status: StudentStatus.ACTIVE },
      ]);
      trendRepo.find.mockResolvedValue([
        { studentId, subjectId, decliningTrend: true, lastComputedAt: new Date('2026-01-05') },
      ]);
      termRepo.find.mockResolvedValue([{ id: 1, academicYear: String(new Date().getFullYear()) }]);
      assessmentRepo.find.mockResolvedValue([
        { id: 'a1', subjectId, termId: 1, title: 'Test 1', scheduledDate: new Date('2026-02-01'), totalMarks: 100 },
        { id: 'a2', subjectId, termId: 1, title: 'Test 2', scheduledDate: new Date('2026-01-01'), totalMarks: 100 },
      ]);
      markRepo.find.mockResolvedValue([
        { studentId, assessmentId: 'a1', score: '60', status: MarkStatus.SUBMITTED },
        { studentId, assessmentId: 'a2', score: '90', status: MarkStatus.SUBMITTED },
      ]);

      const result = await service.getClassSubjectTrends(classSectionId, subjectId, staffId, false);

      expect(result).toHaveLength(1);
      expect(result[0].decliningTrend).toBe(true);
      // a2 (Jan 1) should come before a1 (Feb 1) once sorted chronologically
      expect(result[0].series.map((p) => p.assessmentId)).toEqual(['a2', 'a1']);
      expect(result[0].series[0].percentScore).toBe(90);
      expect(result[0].series[1].percentScore).toBe(60);
    });
  });

  describe('computeAllTrends — attendance-grade correlation', () => {
    const declineDates = ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29'];
    const decliningScores = [96, 90, 60, 54, 48]; // windowSize=3 rolling avgs: 82, 68, 54 -> declining
    const stableScores = [60, 66, 72, 78, 84]; // rolling avgs: 66, 72, 78 -> improving, not declining

    const makeAssessments = (scores: number[]) =>
      scores.map((_, i) => ({
        id: `a${i + 1}`,
        subjectId,
        termId: 1,
        title: `Test ${i + 1}`,
        scheduledDate: new Date(declineDates[i]),
        totalMarks: 100,
      }));

    const makeMarks = (scores: number[]) =>
      scores.map((score, i) => ({
        studentId,
        assessmentId: `a${i + 1}`,
        score: String(score),
        status: MarkStatus.SUBMITTED,
      }));

    const decliningAttendance = [
      { date: new Date('2026-01-01'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-02'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-03'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-04'), status: AttendanceStatus.ABSENT },
      { date: new Date('2026-01-05'), status: AttendanceStatus.ABSENT },
    ];
    const improvingAttendance = [
      { date: new Date('2026-01-01'), status: AttendanceStatus.ABSENT },
      { date: new Date('2026-01-02'), status: AttendanceStatus.ABSENT },
      { date: new Date('2026-01-03'), status: AttendanceStatus.ABSENT },
      { date: new Date('2026-01-04'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-05'), status: AttendanceStatus.PRESENT },
    ];

    beforeEach(() => {
      termRepo.find.mockResolvedValue([{ id: 1, academicYear: String(new Date().getFullYear()) }]);
      subjectRepo.find.mockResolvedValue([{ id: subjectId, name: 'Mathematics' }]);
    });

    it('creates a flag when both grade AND attendance are declining for the same student/subject', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(decliningScores));
      markRepo.find.mockResolvedValue(makeMarks(decliningScores));
      attendanceRepo.find.mockResolvedValue(decliningAttendance);
      patternFlagRepo.findOne.mockResolvedValue(null);

      await service.computeAllTrends();

      expect(patternFlagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId,
          subjectId,
          description: buildPatternDescription('Mathematics'),
        }),
      );
      expect(patternFlagRepo.remove).not.toHaveBeenCalled();
    });

    it('does not create an attendance_grade_correlation flag when only grade is declining (attendance stable)', async () => {
      // Note: this scenario now creates an effort_outcome_mismatch flag instead (see that describe block) —
      // this test only asserts the CORRELATION type specifically is not created.
      assessmentRepo.find.mockResolvedValue(makeAssessments(decliningScores));
      markRepo.find.mockResolvedValue(makeMarks(decliningScores));
      attendanceRepo.find.mockResolvedValue(improvingAttendance);
      patternFlagRepo.findOne.mockResolvedValue(null);

      await service.computeAllTrends();

      expect(patternFlagRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: AcademicPatternFlagType.ATTENDANCE_GRADE_CORRELATION }),
      );
    });

    it('does not create a flag when only attendance is declining (grade stable)', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(stableScores));
      markRepo.find.mockResolvedValue(makeMarks(stableScores));
      attendanceRepo.find.mockResolvedValue(decliningAttendance);
      patternFlagRepo.findOne.mockResolvedValue(null);

      await service.computeAllTrends();

      expect(patternFlagRepo.save).not.toHaveBeenCalled();
    });

    it('deletes an existing flag when the correlation no longer holds this run', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(stableScores));
      markRepo.find.mockResolvedValue(makeMarks(stableScores));
      attendanceRepo.find.mockResolvedValue(improvingAttendance);
      const existingFlag = { id: 'flag-1', studentId, subjectId };
      patternFlagRepo.findOne.mockResolvedValue(existingFlag);

      await service.computeAllTrends();

      expect(patternFlagRepo.remove).toHaveBeenCalledWith(existingFlag);
      expect(patternFlagRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('buildEffortOutcomeMismatchMessage — verbatim template', () => {
    it('returns the exact fixed template string, verbatim, for several subject names', () => {
      expect(buildEffortOutcomeMismatchMessage('Mathematics')).toBe(
        'This student may benefit from extra support in Mathematics.',
      );
      expect(buildEffortOutcomeMismatchMessage('Science')).toBe(
        'This student may benefit from extra support in Science.',
      );
      expect(buildEffortOutcomeMismatchMessage('ICT')).toBe(
        'This student may benefit from extra support in ICT.',
      );
    });

    it('never contains any forbidden clinical/disorder-name substring, for any subject name', () => {
      const subjectNames = [
        'Mathematics', 'Science', 'History', 'Sinhala', 'Tamil', 'English',
        'ICT', 'Commerce', 'Buddhism', 'Health Studies', 'this subject',
      ];

      for (const name of subjectNames) {
        const message = buildEffortOutcomeMismatchMessage(name).toLowerCase();
        for (const term of FORBIDDEN_CLINICAL_TERMS) {
          expect(message).not.toContain(term);
        }
      }
    });
  });

  describe('computeAllTrends — effort-outcome mismatch', () => {
    const declineDates = ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29'];
    const decliningScores = [96, 90, 60, 54, 48];
    const stableScores = [60, 66, 72, 78, 84];

    const makeAssessments = (scores: number[]) =>
      scores.map((_, i) => ({
        id: `a${i + 1}`,
        subjectId,
        termId: 1,
        title: `Test ${i + 1}`,
        scheduledDate: new Date(declineDates[i]),
        totalMarks: 100,
      }));

    const makeMarks = (scores: number[]) =>
      scores.map((score, i) => ({
        studentId,
        assessmentId: `a${i + 1}`,
        score: String(score),
        status: MarkStatus.SUBMITTED,
      }));

    const stableAttendance = [
      { date: new Date('2026-01-01'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-02'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-03'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-04'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-05'), status: AttendanceStatus.PRESENT },
    ];
    const decliningAttendance = [
      { date: new Date('2026-01-01'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-02'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-03'), status: AttendanceStatus.PRESENT },
      { date: new Date('2026-01-04'), status: AttendanceStatus.ABSENT },
      { date: new Date('2026-01-05'), status: AttendanceStatus.ABSENT },
    ];

    beforeEach(() => {
      termRepo.find.mockResolvedValue([{ id: 1, academicYear: String(new Date().getFullYear()) }]);
      subjectRepo.find.mockResolvedValue([{ id: subjectId, name: 'Mathematics' }]);
      studentRepo.find.mockResolvedValue([{ id: studentId, classSectionId }]);
      requirementRepo.find.mockResolvedValue([{ teacherId: staffId, subjectId, classSectionId }]);
    });

    it('creates an effort_outcome_mismatch flag and notifies the subject teacher when grade is declining but attendance is not', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(decliningScores));
      markRepo.find.mockResolvedValue(makeMarks(decliningScores));
      attendanceRepo.find.mockResolvedValue(stableAttendance);
      patternFlagRepo.findOne.mockResolvedValue(null);

      await service.computeAllTrends();

      expect(patternFlagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId,
          subjectId,
          type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
          description: buildEffortOutcomeMismatchMessage('Mathematics'),
        }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        staffId,
        expect.any(String),
        buildEffortOutcomeMismatchMessage('Mathematics'),
        'effort_outcome_mismatch',
      );
    });

    it('does not create this flag when both grade and attendance are declining (that is the correlation flag instead)', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(decliningScores));
      markRepo.find.mockResolvedValue(makeMarks(decliningScores));
      attendanceRepo.find.mockResolvedValue(decliningAttendance);
      patternFlagRepo.findOne.mockResolvedValue(null);

      await service.computeAllTrends();

      expect(patternFlagRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH }),
      );
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('does not create this flag when grade is not declining at all', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(stableScores));
      markRepo.find.mockResolvedValue(makeMarks(stableScores));
      attendanceRepo.find.mockResolvedValue(stableAttendance);
      patternFlagRepo.findOne.mockResolvedValue(null);

      await service.computeAllTrends();

      expect(patternFlagRepo.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH }),
      );
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('does not notify again on a subsequent run where the flag already exists', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(decliningScores));
      markRepo.find.mockResolvedValue(makeMarks(decliningScores));
      attendanceRepo.find.mockResolvedValue(stableAttendance);
      const existingEffortFlag = {
        id: 'effort-flag-1',
        studentId,
        subjectId,
        type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
      };
      patternFlagRepo.findOne.mockImplementation((opts: { where: { type: AcademicPatternFlagType } }) =>
        Promise.resolve(
          opts.where.type === AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH ? existingEffortFlag : null,
        ),
      );

      await service.computeAllTrends();

      expect(patternFlagRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'effort-flag-1',
          type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
        }),
      );
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });

    it('deletes the flag when the mismatch condition no longer holds', async () => {
      assessmentRepo.find.mockResolvedValue(makeAssessments(stableScores));
      markRepo.find.mockResolvedValue(makeMarks(stableScores));
      attendanceRepo.find.mockResolvedValue(stableAttendance);
      const existingEffortFlag = {
        id: 'effort-flag-2',
        studentId,
        subjectId,
        type: AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH,
      };
      patternFlagRepo.findOne.mockImplementation((opts: { where: { type: AcademicPatternFlagType } }) =>
        Promise.resolve(
          opts.where.type === AcademicPatternFlagType.EFFORT_OUTCOME_MISMATCH ? existingEffortFlag : null,
        ),
      );

      await service.computeAllTrends();

      expect(patternFlagRepo.remove).toHaveBeenCalledWith(existingEffortFlag);
      expect(notificationService.createForStaff).not.toHaveBeenCalled();
    });
  });

  describe('buildPatternDescription — content safety', () => {
    it('never contains any forbidden clinical/disorder-name substring, for any subject name', () => {
      const subjectNames = [
        'Mathematics', 'Science', 'History', 'Sinhala', 'Tamil', 'English',
        'ICT', 'Commerce', 'Buddhism', 'Health Studies', 'this subject',
      ];

      for (const name of subjectNames) {
        const description = buildPatternDescription(name).toLowerCase();
        for (const term of FORBIDDEN_CLINICAL_TERMS) {
          expect(description).not.toContain(term);
        }
      }
    });
  });
});
