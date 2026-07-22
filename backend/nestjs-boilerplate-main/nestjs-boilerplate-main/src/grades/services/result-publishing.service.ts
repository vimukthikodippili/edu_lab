import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { MarkTopicScoreEntity } from '../entities/mark-topic-score.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { ResultsPublishedEvent } from '../events/results-published.event';

export interface PublishedAssessmentTopicScoreRow {
  subjectTopicId: string;
  title: string;
  maxMarks: number;
  score: number;
}

export interface PublishedAssessmentResultRow {
  assessment: {
    id: string;
    title: string;
    assessmentType: string;
    scheduledDate: Date;
    totalMarks: number;
  };
  score: number;
  maxScore: number;
  topicScores: PublishedAssessmentTopicScoreRow[];
}

export interface PublishResultsSummary {
  classSectionId: number;
  termId: number;
  publishedCount: number;
  skippedIncompleteCount: number;
  alreadyPublishedCount: number;
}

@Injectable()
export class ResultPublishingService {
  private readonly logger = new Logger(ResultPublishingService.name);

  constructor(
    @InjectRepository(TermResultEntity)
    private readonly termResultRepo: Repository<TermResultEntity>,
    @InjectRepository(SubjectResultEntity)
    private readonly subjectResultRepo: Repository<SubjectResultEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,
    @InjectRepository(MarkTopicScoreEntity)
    private readonly topicScoreRepo: Repository<MarkTopicScoreEntity>,
    @InjectRepository(AssessmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssessmentTopicAllocationEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publishClassResults(
    classSectionId: number,
    termId: number,
  ): Promise<PublishResultsSummary> {
    const rows = await this.termResultRepo.find({
      where: { classSectionId, termId },
    });

    const eligible = rows.filter((r) => r.isComplete);
    const skippedIncompleteCount = rows.length - eligible.length;

    const newlyPublished = eligible.filter((r) => !r.isPublished);
    const alreadyPublishedCount = eligible.length - newlyPublished.length;

    const now = new Date();
    newlyPublished.forEach((r) => {
      r.isPublished = true;
      r.publishedAt = now;
    });

    if (newlyPublished.length > 0) {
      await this.termResultRepo.save(newlyPublished);
      this.eventEmitter.emit(
        'results.published',
        new ResultsPublishedEvent(
          classSectionId,
          termId,
          newlyPublished.map((r) => r.studentId),
        ),
      );
    }

    this.logger.log(
      `Published ${newlyPublished.length} term result(s) for class ${classSectionId}, term ${termId} ` +
        `(skipped ${skippedIncompleteCount} incomplete, ${alreadyPublishedCount} already published).`,
    );

    return {
      classSectionId,
      termId,
      publishedCount: newlyPublished.length,
      skippedIncompleteCount,
      alreadyPublishedCount,
    };
  }

  async getPublishedTermResultForStudent(
    studentId: string,
    termId: number,
  ): Promise<TermResultEntity | null> {
    return this.termResultRepo.findOne({
      where: { studentId, termId, isPublished: true },
      relations: ['reportCardFile', 'term'],
    });
  }

  async getPublishedSubjectResultsForStudent(
    studentId: string,
    termId: number,
  ): Promise<SubjectResultEntity[]> {
    const termResult = await this.termResultRepo.findOne({
      where: { studentId, termId, isPublished: true },
      select: ['id'],
    });
    if (!termResult) {
      return [];
    }
    return this.subjectResultRepo.find({
      where: { studentId, termId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Per-assessment topic breakdown for a published result (P2-TB-10). `topicScores` is
   * empty for any assessment that predates topic allocations — the graceful fallback the
   * AC requires — since a legacy Mark simply has no MarkTopicScoreEntity rows to find.
   */
  async getPublishedAssessmentResultsForStudent(
    studentId: string,
    subjectId: string,
    termId: number,
  ): Promise<PublishedAssessmentResultRow[]> {
    const termResult = await this.termResultRepo.findOne({
      where: { studentId, termId, isPublished: true },
      select: ['id'],
    });
    if (!termResult) {
      return [];
    }

    // No `select` restriction here — SubjectResultEntity has eager `subject`/`term`
    // relations, and combining eager relations with a partial column `select` breaks
    // TypeORM's generated query (confirmed live: "column distinctAlias...id does not exist").
    const subjectResult = await this.subjectResultRepo.findOne({
      where: { studentId, subjectId, termId },
    });
    if (!subjectResult) {
      return [];
    }

    const assessments = await this.assessmentRepo.find({
      where: { subjectId, termId, classSectionId: subjectResult.classSectionId },
    });
    if (assessments.length === 0) {
      return [];
    }
    const assessmentById = new Map(assessments.map((a) => [a.id, a]));

    const marks = await this.markRepo.find({
      where: {
        studentId,
        assessmentId: In(assessments.map((a) => a.id)),
        status: MarkStatus.SUBMITTED,
      },
    });
    if (marks.length === 0) {
      return [];
    }

    const topicScores = await this.topicScoreRepo.find({
      where: { markId: In(marks.map((m) => m.id)) },
    });
    const topicScoresByMarkId = new Map<string, MarkTopicScoreEntity[]>();
    for (const ts of topicScores) {
      const list = topicScoresByMarkId.get(ts.markId) ?? [];
      list.push(ts);
      topicScoresByMarkId.set(ts.markId, list);
    }

    const allocations = await this.allocationRepo.find({
      where: { assessmentId: In(assessments.map((a) => a.id)) },
    });
    const maxMarksByKey = new Map(
      allocations.map((a) => [`${a.assessmentId}:${a.subjectTopicId}`, a.maxMarks]),
    );

    const rows = marks.map((mark) => {
      const assessment = assessmentById.get(mark.assessmentId)!;
      return {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          assessmentType: assessment.assessmentType,
          scheduledDate: assessment.scheduledDate,
          totalMarks: assessment.totalMarks,
        },
        score: Number(mark.score),
        maxScore: mark.maxScore,
        topicScores: (topicScoresByMarkId.get(mark.id) ?? []).map((ts) => ({
          subjectTopicId: ts.subjectTopicId,
          title: ts.subjectTopic.title,
          maxMarks: maxMarksByKey.get(`${mark.assessmentId}:${ts.subjectTopicId}`) ?? 0,
          score: Number(ts.score),
        })),
      };
    });

    rows.sort(
      (a, b) =>
        new Date(a.assessment.scheduledDate).getTime() -
        new Date(b.assessment.scheduledDate).getTime(),
    );
    return rows;
  }
}
