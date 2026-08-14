import { Test, TestingModule } from '@nestjs/testing';
import { ResultComputationListener } from './result-computation.listener';
import { ResultComputationService } from '../services/result-computation.service';
import { MarksSubmittedEvent } from '../events/marks-submitted.event';

describe('ResultComputationListener', () => {
  let listener: ResultComputationListener;
  let resultComputationService: {
    recomputeTermResult: jest.Mock;
    recomputeClassRank: jest.Mock;
    recomputeSubjectClassRank: jest.Mock;
  };

  beforeEach(async () => {
    resultComputationService = {
      recomputeTermResult: jest.fn().mockResolvedValue(undefined),
      recomputeClassRank: jest.fn().mockResolvedValue(undefined),
      recomputeSubjectClassRank: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultComputationListener,
        { provide: ResultComputationService, useValue: resultComputationService },
      ],
    }).compile();

    listener = module.get<ResultComputationListener>(ResultComputationListener);
  });

  it('recomputes the term result once per student and the class rank exactly once', async () => {
    const event = new MarksSubmittedEvent('a1', 'subject-1', 1, 1, ['s1', 's2', 's3']);

    await listener.handle(event);

    expect(resultComputationService.recomputeTermResult).toHaveBeenCalledTimes(3);
    expect(resultComputationService.recomputeTermResult).toHaveBeenNthCalledWith(1, 's1', 1, 1);
    expect(resultComputationService.recomputeTermResult).toHaveBeenNthCalledWith(2, 's2', 1, 1);
    expect(resultComputationService.recomputeTermResult).toHaveBeenNthCalledWith(3, 's3', 1, 1);
    expect(resultComputationService.recomputeClassRank).toHaveBeenCalledTimes(1);
    expect(resultComputationService.recomputeClassRank).toHaveBeenCalledWith(1, 1);
    expect(resultComputationService.recomputeSubjectClassRank).toHaveBeenCalledTimes(1);
    expect(resultComputationService.recomputeSubjectClassRank).toHaveBeenCalledWith('subject-1', 1, 1);
  });

  it('does not throw and still recomputes class rank when one student recompute rejects', async () => {
    resultComputationService.recomputeTermResult
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);

    const event = new MarksSubmittedEvent('a1', 'subject-1', 1, 1, ['s1', 's2', 's3']);

    await expect(listener.handle(event)).resolves.toBeUndefined();
    expect(resultComputationService.recomputeClassRank).toHaveBeenCalledTimes(1);
  });

  it('does not propagate an exception thrown by recomputeClassRank', async () => {
    resultComputationService.recomputeClassRank.mockRejectedValueOnce(new Error('rank failed'));

    const event = new MarksSubmittedEvent('a1', 'subject-1', 1, 1, ['s1']);

    await expect(listener.handle(event)).resolves.toBeUndefined();
  });

  it('does not propagate an exception thrown by recomputeSubjectClassRank', async () => {
    resultComputationService.recomputeSubjectClassRank.mockRejectedValueOnce(new Error('subject rank failed'));

    const event = new MarksSubmittedEvent('a1', 'subject-1', 1, 1, ['s1']);

    await expect(listener.handle(event)).resolves.toBeUndefined();
  });
});
