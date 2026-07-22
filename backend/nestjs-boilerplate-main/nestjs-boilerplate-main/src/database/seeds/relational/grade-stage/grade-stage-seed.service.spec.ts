import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GradeStageSeedService } from './grade-stage-seed.service';
import { GradeStageEntity } from '../../../../students/entities/grade-stage.entity';

// The one seed service in this codebase with direct test coverage — added specifically because
// "default stage seeding" is one of the story's explicitly-requested tests, an exception to the
// otherwise-untested convention every other seed service in src/database/seeds follows.
describe('GradeStageSeedService', () => {
  let service: GradeStageSeedService;
  let repo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((d) => d),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeStageSeedService,
        { provide: getRepositoryToken(GradeStageEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<GradeStageSeedService>(GradeStageSeedService);
  });

  it('seeds all 4 default Sri Lankan grade stages on a fresh database', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.run();

    expect(repo.save).toHaveBeenCalledTimes(4);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ stageName: 'Primary', fromGrade: 1, toGrade: 5, ordering: 0 }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ stageName: 'Junior Secondary', fromGrade: 6, toGrade: 9, ordering: 1 }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ stageName: 'Senior Secondary', fromGrade: 10, toGrade: 11, ordering: 2 }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ stageName: 'Collegiate', fromGrade: 12, toGrade: 13, ordering: 3 }),
    );
  });

  it('is idempotent — running twice does not create duplicates', async () => {
    repo.findOne.mockResolvedValue({ id: 'already-exists' });

    await service.run();

    expect(repo.save).not.toHaveBeenCalled();
  });
});
