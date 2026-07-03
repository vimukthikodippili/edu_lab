import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MarksSubmittedEvent } from '../events/marks-submitted.event';
import { ResultComputationService } from '../services/result-computation.service';

@Injectable()
export class ResultComputationListener {
  private readonly logger = new Logger(ResultComputationListener.name);

  constructor(
    private readonly resultComputationService: ResultComputationService,
  ) {}

  @OnEvent('marks.submitted', { async: true })
  async handle(event: MarksSubmittedEvent): Promise<void> {
    try {
      const outcomes = await Promise.allSettled(
        event.studentIds.map((studentId) =>
          this.resultComputationService.recomputeTermResult(
            studentId,
            event.termId,
            event.classSectionId,
          ),
        ),
      );

      outcomes.forEach((outcome, idx) => {
        if (outcome.status === 'rejected') {
          this.logger.error(
            `Failed to recompute term result for student ${event.studentIds[idx]}: ${outcome.reason}`,
          );
        }
      });

      await this.resultComputationService.recomputeClassRank(
        event.classSectionId,
        event.termId,
      );
    } catch (err) {
      this.logger.error(
        `Unexpected error processing marks.submitted event ${JSON.stringify(event)}: ${err}`,
      );
    }
  }
}
