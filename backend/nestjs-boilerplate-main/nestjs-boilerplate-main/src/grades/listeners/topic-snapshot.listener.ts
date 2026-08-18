import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ResultsPublishedEvent } from '../events/results-published.event';
import { PerformanceTrendService } from '../services/performance-trend.service';

@Injectable()
export class TopicSnapshotListener {
  private readonly logger = new Logger(TopicSnapshotListener.name);

  constructor(private readonly performanceTrendService: PerformanceTrendService) {}

  @OnEvent('results.published', { async: true })
  async handle(event: ResultsPublishedEvent): Promise<void> {
    try {
      const count = await this.performanceTrendService.computeTopicSnapshotsForTerm(
        event.termId,
        event.classSectionId,
        event.studentIds,
      );
      this.logger.log(
        `Computed ${count} topic-term snapshot(s) for class ${event.classSectionId}, term ${event.termId}.`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to compute topic snapshots for results.published event ${JSON.stringify(event)}: ${err}`,
      );
    }
  }
}
