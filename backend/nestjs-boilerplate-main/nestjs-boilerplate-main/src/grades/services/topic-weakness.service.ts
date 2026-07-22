import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Between, In, Repository } from 'typeorm';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { TopicWeaknessFlagEntity } from '../entities/topic-weakness-flag.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { AllConfigType } from '../../config/config.type';

export interface TopicWeaknessRow {
  subjectTopicId: string;
  title: string;
  isWeak: boolean;
  studentAverage: number;
  classAverage: number;
  computedAt: Date;
}

interface TopicScorePoint {
  percent: number;
  scheduledDate: Date;
}

@Injectable()
export class TopicWeaknessService {
  private readonly logger = new Logger(TopicWeaknessService.name);

  constructor(
    @InjectRepository(MarkTopicScoreEntity)
    private readonly topicScoreRepo: Repository<MarkTopicScoreEntity>,

    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,

    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,

    @InjectRepository(AssessmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssessmentTopicAllocationEntity>,

    @InjectRepository(TopicWeaknessFlagEntity)
    private readonly flagRepo: Repository<TopicWeaknessFlagEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  private async assertAuthorized(
    subjectId: string,
    classSectionId: number,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    const count = await this.requirementRepo.count({
      where: { teacherId, subjectId, classSectionId },
    });
    if (count === 0) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject for this class section.',
      );
    }
  }

  async getForStudent(
    studentId: string,
    subjectId: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<TopicWeaknessRow[]> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found.`);
    }
    await this.assertAuthorized(subjectId, student.classSectionId, teacherId, isPrivileged);

    const flags = await this.flagRepo.find({ where: { studentId, subjectId } });
    return flags.map((f) => ({
      subjectTopicId: f.subjectTopicId,
      title: f.subjectTopic.title,
      isWeak: f.isWeak,
      studentAverage: Number(f.studentAverage),
      classAverage: Number(f.classAverage),
      computedAt: f.computedAt,
    }));
  }

  /**
   * Weekly batch, mirroring GradeTrendService.computeAllTrends()'s exact schedule (FR-SA-09's
   * "weekly auto-refresh"). For every (studentId, subjectTopicId) pair with topic-mark data
   * this academic year: the student's average is the mean of their most recent `windowSize`
   * scores for that topic, each normalized to a percentage of that assessment's own maxMarks
   * (different assessments can allocate a different max to the same topic); the class average
   * is the mean of the same normalized percentage across every student in that topic's class
   * section. `isWeak = studentAverage < classAverage`. Skips (no upsert) below `windowSize`
   * data points, mirroring GradeTrendService's own minimum-data gate.
   */
  @Cron('0 6 * * 1')
  async computeAllFlags(): Promise<void> {
    const windowSize = this.configService.get('topicWeakness.windowSize', {
      infer: true,
    }) as number;

    const academicYear = String(new Date().getFullYear());
    const yearStart = new Date(`${academicYear}-01-01T00:00:00Z`);
    const yearEnd = new Date(`${academicYear}-12-31T23:59:59Z`);

    const assessments = await this.assessmentRepo.find({
      where: { scheduledDate: Between(yearStart, yearEnd) },
    });
    if (assessments.length === 0) return;
    const assessmentById = new Map(assessments.map((a) => [a.id, a]));

    const marks = await this.markRepo.find({
      where: {
        assessmentId: In(assessments.map((a) => a.id)),
        status: MarkStatus.SUBMITTED,
      },
    });
    if (marks.length === 0) return;
    const markById = new Map(marks.map((m) => [m.id, m]));

    const topicScores = await this.topicScoreRepo.find({
      where: { markId: In(marks.map((m) => m.id)) },
    });
    if (topicScores.length === 0) return;

    const allocations = await this.allocationRepo.find({
      where: { assessmentId: In(assessments.map((a) => a.id)) },
    });
    const maxMarksByKey = new Map(
      allocations.map((a) => [`${a.assessmentId}:${a.subjectTopicId}`, a.maxMarks]),
    );

    // studentId::subjectTopicId -> that student's own chronological score points
    const byStudentTopic = new Map<string, TopicScorePoint[]>();
    // classSectionId::subjectTopicId -> every student's normalized percentage (peer group)
    const byClassTopic = new Map<string, number[]>();
    const contextByKey = new Map<
      string,
      { studentId: string; subjectId: string; subjectTopicId: string; classSectionId: number }
    >();

    for (const ts of topicScores) {
      const mark = markById.get(ts.markId);
      if (!mark) continue;
      const assessment = assessmentById.get(mark.assessmentId);
      if (!assessment) continue;
      const maxMarks = maxMarksByKey.get(`${mark.assessmentId}:${ts.subjectTopicId}`);
      if (!maxMarks) continue;

      const percent = (Number(ts.score) / maxMarks) * 100;

      const studentKey = `${mark.studentId}::${ts.subjectTopicId}`;
      const points = byStudentTopic.get(studentKey) ?? [];
      points.push({ percent, scheduledDate: assessment.scheduledDate });
      byStudentTopic.set(studentKey, points);
      contextByKey.set(studentKey, {
        studentId: mark.studentId,
        subjectId: assessment.subjectId,
        subjectTopicId: ts.subjectTopicId,
        classSectionId: assessment.classSectionId,
      });

      const classKey = `${assessment.classSectionId}::${ts.subjectTopicId}`;
      const classPercents = byClassTopic.get(classKey) ?? [];
      classPercents.push(percent);
      byClassTopic.set(classKey, classPercents);
    }

    let computedCount = 0;
    let weakCount = 0;
    const rowsToSave: TopicWeaknessFlagEntity[] = [];

    for (const [key, points] of byStudentTopic.entries()) {
      if (points.length < windowSize) continue;

      const context = contextByKey.get(key)!;
      const recentN = [...points]
        .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
        .slice(0, windowSize);
      const studentAverage = recentN.reduce((sum, p) => sum + p.percent, 0) / recentN.length;

      const classPercents =
        byClassTopic.get(`${context.classSectionId}::${context.subjectTopicId}`) ?? [];
      const classAverage =
        classPercents.reduce((sum, p) => sum + p, 0) / classPercents.length;

      const isWeak = studentAverage < classAverage;

      let row = await this.flagRepo.findOne({
        where: { studentId: context.studentId, subjectTopicId: context.subjectTopicId },
      });
      if (!row) {
        row = this.flagRepo.create({
          studentId: context.studentId,
          subjectTopicId: context.subjectTopicId,
        });
      }
      row.subjectId = context.subjectId;
      row.classSectionId = context.classSectionId;
      row.isWeak = isWeak;
      row.studentAverage = studentAverage.toFixed(2);
      row.classAverage = classAverage.toFixed(2);
      row.computedAt = new Date();
      rowsToSave.push(row);

      computedCount++;
      if (isWeak) weakCount++;
    }

    if (rowsToSave.length) {
      await this.flagRepo.save(rowsToSave);
    }

    this.logger.log(
      `Computed topic weakness flags for ${computedCount} student/topic pair(s), ${weakCount} flagged weak.`,
    );
  }
}
