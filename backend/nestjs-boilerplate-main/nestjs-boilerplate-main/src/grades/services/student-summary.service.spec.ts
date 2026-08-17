import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StudentSummaryService } from './student-summary.service';
import { FORBIDDEN_CLINICAL_TERMS } from './grade-trend.service';
import { TopicWeaknessService } from './topic-weakness.service';
import { StudentEntity } from '../../students/entities/student.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { AttendanceRecordEntity, AttendanceStatus } from '../../attendance/entities/attendance-record.entity';
import { AcademicTermEntity } from '../entities/academic-term.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { TermResultEntity } from '../entities/term-result.entity';
import { StudentGradeTrendEntity } from '../entities/student-grade-trend.entity';
import { AcademicPatternFlagEntity, AcademicPatternFlagType } from '../entities/academic-pattern-flag.entity';

const studentId = 'student-uuid';
const classSectionId = 1;
const mathsId = 'subject-maths';
const scienceId = 'subject-science';

// 'date'-typed Postgres columns arrive over the wire as raw "YYYY-MM-DD" strings in this
// codebase (confirmed convention), not parsed Date objects — mock accordingly so
// resolveTargetTerm's `.toString().slice(0, 10)` comparisons behave as they do in production.
const term = {
  id: 1,
  name: 'Term 1',
  termNumber: 1,
  academicYear: '2026',
  startDate: '2026-01-01',
  endDate: '2026-04-30',
};

const student = {
  id: studentId,
  firstName: 'Ama',
  lastName: 'Silva',
  admissionNumber: 'SIMS/2026/001',
  classSectionId,
  grade: { name: 'Grade 10' },
  classSection: { name: '10A' },
  photo: null,
  stream: null,
};

describe('StudentSummaryService', () => {
  let service: StudentSummaryService;

  let studentRepo: { findOne: jest.Mock };
  let subjectRepo: { find: jest.Mock };
  let requirementRepo: { findOne: jest.Mock };
  let attendanceRepo: { count: jest.Mock; find: jest.Mock };
  let termRepo: { findOne: jest.Mock; find: jest.Mock };
  let assessmentRepo: { find: jest.Mock };
  let markRepo: { find: jest.Mock };
  let subjectResultRepo: { find: jest.Mock; findOne: jest.Mock; count: jest.Mock };
  let termResultRepo: { findOne: jest.Mock };
  let trendRepo: { findOne: jest.Mock };
  let patternFlagRepo: { find: jest.Mock };
  let topicWeaknessService: { getForStudent: jest.Mock };

  beforeEach(async () => {
    studentRepo = { findOne: jest.fn().mockResolvedValue(student) };
    subjectRepo = {
      find: jest.fn().mockResolvedValue([
        { id: mathsId, name: 'Mathematics' },
        { id: scienceId, name: 'Science' },
      ]),
    };
    requirementRepo = { findOne: jest.fn().mockResolvedValue(null) };
    attendanceRepo = { count: jest.fn().mockResolvedValue(0), find: jest.fn().mockResolvedValue([]) };
    termRepo = { findOne: jest.fn().mockResolvedValue(term), find: jest.fn().mockResolvedValue([term]) };
    assessmentRepo = { find: jest.fn().mockResolvedValue([]) };
    markRepo = { find: jest.fn().mockResolvedValue([]) };
    subjectResultRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };
    termResultRepo = { findOne: jest.fn().mockResolvedValue(null) };
    trendRepo = { findOne: jest.fn().mockResolvedValue(null) };
    patternFlagRepo = { find: jest.fn().mockResolvedValue([]) };
    topicWeaknessService = { getForStudent: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentSummaryService,
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(SubjectEntity), useValue: subjectRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(AttendanceRecordEntity), useValue: attendanceRepo },
        { provide: getRepositoryToken(AcademicTermEntity), useValue: termRepo },
        { provide: getRepositoryToken(AssessmentEntity), useValue: assessmentRepo },
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: getRepositoryToken(SubjectResultEntity), useValue: subjectResultRepo },
        { provide: getRepositoryToken(TermResultEntity), useValue: termResultRepo },
        { provide: getRepositoryToken(StudentGradeTrendEntity), useValue: trendRepo },
        { provide: getRepositoryToken(AcademicPatternFlagEntity), useValue: patternFlagRepo },
        { provide: TopicWeaknessService, useValue: topicWeaknessService },
      ],
    }).compile();

    service = module.get(StudentSummaryService);
  });

  it('throws NotFoundException when the student does not exist', async () => {
    studentRepo.findOne.mockResolvedValue(null);
    await expect(service.getStudentSummary('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when no academic terms are configured', async () => {
    termRepo.find.mockResolvedValue([]);
    await expect(service.getStudentSummary(studentId)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException for an explicit termId that does not exist', async () => {
    termRepo.findOne.mockResolvedValue(null);
    await expect(service.getStudentSummary(studentId, 999)).rejects.toThrow(NotFoundException);
  });

  describe('subject discovery + averages — worked example (marks-based, no enrollment row needed)', () => {
    // Maths: 72/65/80 out of 100 -> average 72.33. Science: 55/60/58 out of 100 -> average 57.67.
    // Deliberately no StudentSubjectEnrollmentEntity mock is wired up anywhere in this suite —
    // subjects must be discovered purely from the student's own submitted marks.
    beforeEach(() => {
      assessmentRepo.find.mockResolvedValue([
        { id: 'm1', subjectId: mathsId, termId: term.id, classSectionId, title: 'Maths Test 1', scheduledDate: new Date('2026-02-01'), totalMarks: 100 },
        { id: 'm2', subjectId: mathsId, termId: term.id, classSectionId, title: 'Maths Test 2', scheduledDate: new Date('2026-02-08'), totalMarks: 100 },
        { id: 'm3', subjectId: mathsId, termId: term.id, classSectionId, title: 'Maths Test 3', scheduledDate: new Date('2026-02-15'), totalMarks: 100 },
        { id: 's1', subjectId: scienceId, termId: term.id, classSectionId, title: 'Science Test 1', scheduledDate: new Date('2026-02-01'), totalMarks: 100 },
        { id: 's2', subjectId: scienceId, termId: term.id, classSectionId, title: 'Science Test 2', scheduledDate: new Date('2026-02-08'), totalMarks: 100 },
        { id: 's3', subjectId: scienceId, termId: term.id, classSectionId, title: 'Science Test 3', scheduledDate: new Date('2026-02-15'), totalMarks: 100 },
      ]);
      // The service issues markRepo.find both scoped to this student (subject discovery +
      // fallback average) and unscoped per subject inside buildAssessmentHistory (class rank).
      // All calls here return the same student's marks — sufficient since this describe block
      // only asserts thisTermAverage/assessmentCount, not per-assessment rank (covered below).
      markRepo.find.mockResolvedValue([
        { id: 'mk-m1', studentId, assessmentId: 'm1', score: '72', status: MarkStatus.SUBMITTED },
        { id: 'mk-m2', studentId, assessmentId: 'm2', score: '65', status: MarkStatus.SUBMITTED },
        { id: 'mk-m3', studentId, assessmentId: 'm3', score: '80', status: MarkStatus.SUBMITTED },
        { id: 'mk-s1', studentId, assessmentId: 's1', score: '55', status: MarkStatus.SUBMITTED },
        { id: 'mk-s2', studentId, assessmentId: 's2', score: '60', status: MarkStatus.SUBMITTED },
        { id: 'mk-s3', studentId, assessmentId: 's3', score: '58', status: MarkStatus.SUBMITTED },
      ]);
    });

    it('computes thisTermAverage directly from marks when no precomputed SubjectResultEntity exists', async () => {
      const result = await service.getStudentSummary(studentId, term.id);

      const maths = result.subjectSummaries.find((s) => s.subjectId === mathsId);
      const science = result.subjectSummaries.find((s) => s.subjectId === scienceId);

      expect(maths?.thisTermAverage).toBeCloseTo(72.33, 2);
      expect(science?.thisTermAverage).toBeCloseTo(57.67, 2);
      expect(maths?.assessmentCount).toBe(3);
      expect(science?.assessmentCount).toBe(3);
    });

    it('does not depend on StudentSubjectEnrollmentEntity — subjects come from marks alone', async () => {
      const result = await service.getStudentSummary(studentId, term.id);
      expect(result.subjectSummaries.map((s) => s.subjectId).sort()).toEqual(
        [mathsId, scienceId].sort(),
      );
    });
  });

  describe('fast path — precomputed SubjectResultEntity', () => {
    beforeEach(() => {
      assessmentRepo.find.mockResolvedValue([
        { id: 'm1', subjectId: mathsId, termId: term.id, classSectionId, title: 'Maths Test 1', scheduledDate: new Date('2026-02-01'), totalMarks: 100 },
      ]);
      markRepo.find.mockResolvedValue([
        { id: 'mk-m1', studentId, assessmentId: 'm1', score: '72', status: MarkStatus.SUBMITTED },
      ]);
      subjectResultRepo.findOne.mockResolvedValue({
        studentId,
        subjectId: mathsId,
        termId: term.id,
        percentage: '84.50',
        subjectRank: 2,
      });
      subjectResultRepo.count.mockResolvedValue(30);
    });

    it('prefers the precomputed percentage/rank/classSize over a marks-derived average', async () => {
      const result = await service.getStudentSummary(studentId, term.id);
      const maths = result.subjectSummaries.find((s) => s.subjectId === mathsId);
      expect(maths?.thisTermAverage).toBe(84.5);
      expect(maths?.classRankLatest).toBe(2);
      expect(maths?.classSize).toBe(30);
    });
  });

  describe('buildAssessmentHistory — dense per-assessment class rank with ties', () => {
    beforeEach(() => {
      assessmentRepo.find.mockResolvedValue([
        { id: 'm1', subjectId: mathsId, termId: term.id, classSectionId, title: 'Maths Test 1', scheduledDate: new Date('2026-02-01'), totalMarks: 100 },
      ]);
      markRepo.find.mockImplementation(({ where }: any) => {
        const cohort = [
          { id: 'mk-a', studentId, assessmentId: 'm1', score: '80', status: MarkStatus.SUBMITTED },
          { id: 'mk-b', studentId: 'other-1', assessmentId: 'm1', score: '90', status: MarkStatus.SUBMITTED },
          { id: 'mk-c', studentId: 'other-2', assessmentId: 'm1', score: '80', status: MarkStatus.SUBMITTED },
          { id: 'mk-d', studentId: 'other-3', assessmentId: 'm1', score: '70', status: MarkStatus.SUBMITTED },
        ];
        if (where.studentId) return Promise.resolve(cohort.filter((m) => m.studentId === studentId));
        return Promise.resolve(cohort);
      });
    });

    it('assigns dense rank-with-ties: two students tied for 2nd both rank 2, not 2 and 3', async () => {
      const result = await service.getStudentSummary(studentId, term.id);
      const maths = result.subjectSummaries.find((s) => s.subjectId === mathsId);
      // 90 -> rank 1; 80, 80 -> rank 2 (tied, dense); 70 -> rank 3. Our student scored 80.
      expect(maths?.assessmentHistory).toHaveLength(1);
      expect(maths?.assessmentHistory[0].classRank).toBe(2);
      expect(maths?.assessmentHistory[0].classAverage).toBeCloseTo(80, 2); // (80+90+80+70)/4
    });
  });

  describe('recentTrend mapping — declining takes priority over improving', () => {
    beforeEach(() => {
      assessmentRepo.find.mockResolvedValue([
        { id: 'm1', subjectId: mathsId, termId: term.id, classSectionId, title: 'Maths Test 1', scheduledDate: new Date('2026-02-01'), totalMarks: 100 },
      ]);
      markRepo.find.mockResolvedValue([
        { id: 'mk-m1', studentId, assessmentId: 'm1', score: '72', status: MarkStatus.SUBMITTED },
      ]);
    });

    it('reports declining when both flags are somehow true', async () => {
      trendRepo.findOne.mockResolvedValue({ studentId, subjectId: mathsId, decliningTrend: true, improvingTrend: true });
      const result = await service.getStudentSummary(studentId, term.id);
      expect(result.subjectSummaries[0].recentTrend).toBe('declining');
    });

    it('reports improving when only improvingTrend is set', async () => {
      trendRepo.findOne.mockResolvedValue({ studentId, subjectId: mathsId, decliningTrend: false, improvingTrend: true });
      const result = await service.getStudentSummary(studentId, term.id);
      expect(result.subjectSummaries[0].recentTrend).toBe('improving');
    });

    it('reports stable when no trend row exists (honest "not enough data" state)', async () => {
      trendRepo.findOne.mockResolvedValue(null);
      const result = await service.getStudentSummary(studentId, term.id);
      expect(result.subjectSummaries[0].recentTrend).toBe('stable');
    });
  });

  describe('attendanceSummary', () => {
    it('assembles overallRate/thisTermRate/monthlyBreakdown from AttendanceRecordEntity', async () => {
      // Not asserted in this test (overallRate/thisTermRate), only monthlyBreakdown below.
      attendanceRepo.count.mockResolvedValue(10);
      // 'date'-typed Postgres columns arrive over the wire as raw "YYYY-MM-DD" strings in this
      // codebase (not parsed Date objects) — mock accordingly, matching resolveTargetTerm's own
      // `.toString().slice(0, 10)` usage on AcademicTermEntity.startDate/endDate elsewhere.
      attendanceRepo.find.mockResolvedValue([
        { studentId, date: '2026-01-10', status: AttendanceStatus.PRESENT },
        { studentId, date: '2026-01-20', status: AttendanceStatus.ABSENT },
        { studentId, date: '2026-02-05', status: AttendanceStatus.PRESENT },
      ]);

      const result = await service.getStudentSummary(studentId, term.id);

      expect(result.attendanceSummary.monthlyBreakdown).toEqual([
        { month: '2026-01', rate: 50 },
        { month: '2026-02', rate: 100 },
      ]);
    });
  });

  describe('academicFlags — content-safety pass-through', () => {
    it('maps AcademicPatternFlagEntity rows without introducing any clinical framing of its own', async () => {
      patternFlagRepo.find.mockResolvedValue([
        {
          studentId,
          subjectId: mathsId,
          type: AcademicPatternFlagType.ATTENDANCE_GRADE_CORRELATION,
          description: 'Grades and attendance have both been trending down recently in Mathematics.',
          flaggedAt: new Date('2026-03-01'),
        },
      ]);

      const result = await service.getStudentSummary(studentId, term.id);

      expect(result.academicFlags).toHaveLength(1);
      expect(result.academicFlags[0].subjectName).toBe('Mathematics');
      for (const term_ of FORBIDDEN_CLINICAL_TERMS) {
        expect(result.academicFlags[0].description.toLowerCase()).not.toContain(term_.toLowerCase());
      }
    });

    it('returns an empty array (not an error) when no flags exist yet', async () => {
      patternFlagRepo.find.mockResolvedValue([]);
      const result = await service.getStudentSummary(studentId, term.id);
      expect(result.academicFlags).toEqual([]);
    });
  });

  describe('overallRank/overallAverage from TermResultEntity', () => {
    it('returns null for both when the term-level pipeline has not produced a row yet', async () => {
      termResultRepo.findOne.mockResolvedValue(null);
      const result = await service.getStudentSummary(studentId, term.id);
      expect(result.overallRank).toBeNull();
      expect(result.overallAverage).toBeNull();
    });

    it('coerces the string-typed numeric percentage column to a number', async () => {
      termResultRepo.findOne.mockResolvedValue({ studentId, termId: term.id, rank: 5, percentage: '76.40' });
      const result = await service.getStudentSummary(studentId, term.id);
      expect(result.overallRank).toBe(5);
      expect(result.overallAverage).toBe(76.4);
    });
  });
});
