import { Test, TestingModule } from '@nestjs/testing';
import { TopicSnapshotListener } from './topic-snapshot.listener';
import { PerformanceTrendService } from '../services/performance-trend.service';
import { ResultsPublishedEvent } from '../events/results-published.event';

describe('TopicSnapshotListener', () => {
  let listener: TopicSnapshotListener;
  let performanceTrendService: { computeTopicSnapshotsForTerm: jest.Mock };

  beforeEach(async () => {
    performanceTrendService = { computeTopicSnapshotsForTerm: jest.fn().mockResolvedValue(4) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicSnapshotListener,
        { provide: PerformanceTrendService, useValue: performanceTrendService },
      ],
    }).compile();

    listener = module.get(TopicSnapshotListener);
  });

  it('computes topic snapshots scoped to exactly the event\'s classSectionId/termId/studentIds', async () => {
    const event = new ResultsPublishedEvent(27, 3, ['s1', 's2']);
    await listener.handle(event);

    expect(performanceTrendService.computeTopicSnapshotsForTerm).toHaveBeenCalledWith(3, 27, ['s1', 's2']);
  });

  it('swallows a service failure rather than throwing (never crashes the event bus)', async () => {
    performanceTrendService.computeTopicSnapshotsForTerm.mockRejectedValue(new Error('boom'));
    const event = new ResultsPublishedEvent(27, 3, ['s1']);

    await expect(listener.handle(event)).resolves.toBeUndefined();
  });
});
