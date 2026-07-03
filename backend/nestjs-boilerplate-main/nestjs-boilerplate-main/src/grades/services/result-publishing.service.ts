import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { ResultsPublishedEvent } from '../events/results-published.event';

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
}
