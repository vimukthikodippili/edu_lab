import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { TermResultEntity } from '../entities/term-result.entity';
import { StudentSubjectEnrollmentEntity } from '../../enrollments/entities/student-subject-enrollment.entity';
import { GradingBandService } from './grading-band.service';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class ResultComputationService {
  constructor(
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(TermAssessmentPlanEntity)
    private readonly planRepo: Repository<TermAssessmentPlanEntity>,
    @InjectRepository(StudentSubjectEnrollmentEntity)
    private readonly enrollmentRepo: Repository<StudentSubjectEnrollmentEntity>,
    @InjectRepository(SubjectResultEntity)
    private readonly subjectResultRepo: Repository<SubjectResultEntity>,
    @InjectRepository(TermResultEntity)
    private readonly termResultRepo: Repository<TermResultEntity>,
    private readonly gradingBandService: GradingBandService,
  ) {}

  async recomputeSubjectResult(
    studentId: string,
    subjectId: string,
    termId: number,
    classSectionId: number,
  ): Promise<SubjectResultEntity> {
    const plan = await this.planRepo.findOne({
      where: { subjectId, termId },
    });
    const assessments = await this.assessmentRepo.find({
      where: { subjectId, termId, classSectionId },
    });

    let totalScore = 0;
    let totalMaxScore = 0;
    let isComplete = false;

    if (assessments.length > 0) {
      const marks = await this.markRepo.find({
        where: {
          studentId,
          assessmentId: In(assessments.map((a) => a.id)),
          status: MarkStatus.SUBMITTED,
        },
      });
      const markByAssessmentId = new Map(
        marks.map((m) => [m.assessmentId, m]),
      );

      for (const assessment of assessments) {
        const mark = markByAssessmentId.get(assessment.id);
        if (mark) {
          totalScore += Number(mark.score);
          totalMaxScore += assessment.totalMarks;
        }
      }

      isComplete =
        !!plan &&
        plan.requiredAssessmentCount > 0 &&
        assessments.length >= plan.requiredAssessmentCount &&
        assessments.every((a) => markByAssessmentId.has(a.id));
    }

    const percentage = totalMaxScore > 0 ? round2((totalScore / totalMaxScore) * 100) : null;
    const band =
      percentage !== null
        ? await this.gradingBandService.findBandForPercentage(percentage)
        : null;

    let subjectResult = await this.subjectResultRepo.findOne({
      where: { studentId, subjectId, termId },
    });
    if (!subjectResult) {
      subjectResult = this.subjectResultRepo.create({
        studentId,
        subjectId,
        termId,
      });
    }
    subjectResult.classSectionId = classSectionId;
    subjectResult.totalScore = String(totalScore);
    subjectResult.totalMaxScore = String(totalMaxScore);
    subjectResult.percentage = percentage !== null ? String(percentage) : null;
    subjectResult.letterGrade = band?.letter ?? null;
    subjectResult.isComplete = isComplete;

    return this.subjectResultRepo.save(subjectResult);
  }

  async recomputeTermResult(
    studentId: string,
    termId: number,
    classSectionId: number,
  ): Promise<TermResultEntity> {
    const enrollments = await this.enrollmentRepo.find({
      where: { studentId },
    });
    const enrolledSubjectIds = enrollments.map((e) => e.subjectId);

    const requiredSubjectIds: string[] = [];
    if (enrolledSubjectIds.length > 0) {
      const plans = await this.planRepo.find({
        where: { termId, subjectId: In(enrolledSubjectIds) },
      });
      requiredSubjectIds.push(...plans.map((p) => p.subjectId));
    }

    let existing = await this.termResultRepo.findOne({
      where: { studentId, termId },
    });
    if (!existing) {
      existing = this.termResultRepo.create({ studentId, termId });
    }

    if (requiredSubjectIds.length === 0) {
      existing.classSectionId = classSectionId;
      existing.totalScore = '0';
      existing.totalMaxScore = '0';
      existing.percentage = null;
      existing.isComplete = false;
      existing.rank = null;
      return this.termResultRepo.save(existing);
    }

    const subjectResults: SubjectResultEntity[] = [];
    for (const subjectId of requiredSubjectIds) {
      subjectResults.push(
        await this.recomputeSubjectResult(
          studentId,
          subjectId,
          termId,
          classSectionId,
        ),
      );
    }

    const totalScore = subjectResults.reduce(
      (sum, sr) => sum + Number(sr.totalScore),
      0,
    );
    const totalMaxScore = subjectResults.reduce(
      (sum, sr) => sum + Number(sr.totalMaxScore),
      0,
    );
    const percentage = totalMaxScore > 0 ? round2((totalScore / totalMaxScore) * 100) : null;
    const isComplete = subjectResults.every((sr) => sr.isComplete);
    const band =
      percentage !== null
        ? await this.gradingBandService.findBandForPercentage(percentage)
        : null;

    existing.classSectionId = classSectionId;
    existing.totalScore = String(totalScore);
    existing.totalMaxScore = String(totalMaxScore);
    existing.percentage = percentage !== null ? String(percentage) : null;
    existing.letterGrade = band?.letter ?? null;
    existing.isComplete = isComplete;
    if (!isComplete) {
      existing.rank = null;
    }

    return this.termResultRepo.save(existing);
  }

  async recomputeClassRank(
    classSectionId: number,
    termId: number,
  ): Promise<void> {
    const completeRows = await this.termResultRepo.find({
      where: { classSectionId, termId, isComplete: true },
      order: { totalScore: 'DESC' },
    });

    let currentRank = 0;
    let previousScore: string | null = null;
    let rowsSeenSoFar = 0;

    for (const row of completeRows) {
      rowsSeenSoFar += 1;
      if (previousScore === null || row.totalScore !== previousScore) {
        currentRank = rowsSeenSoFar;
        previousScore = row.totalScore;
      }
      row.rank = currentRank;
    }

    if (completeRows.length > 0) {
      await this.termResultRepo.save(completeRows);
    }

    const staleRows = await this.termResultRepo.find({
      where: { classSectionId, termId, isComplete: false },
    });
    const staleRanked = staleRows.filter((r) => r.rank !== null);
    if (staleRanked.length > 0) {
      staleRanked.forEach((r) => {
        r.rank = null;
      });
      await this.termResultRepo.save(staleRanked);
    }
  }
}
