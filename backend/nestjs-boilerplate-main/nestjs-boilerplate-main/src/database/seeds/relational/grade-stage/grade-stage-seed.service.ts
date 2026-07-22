import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeStageEntity } from '../../../../students/entities/grade-stage.entity';

// The current Sri Lankan defaults — no longer fixed forever: an Admin/Principal can add, edit,
// delete, and reorder stages (including these original 4) via GradeStageController.
const DEFAULT_STAGES: { stageName: string; fromGrade: number; toGrade: number; ordering: number }[] = [
  { stageName: 'Primary', fromGrade: 1, toGrade: 5, ordering: 0 },
  { stageName: 'Junior Secondary', fromGrade: 6, toGrade: 9, ordering: 1 },
  { stageName: 'Senior Secondary', fromGrade: 10, toGrade: 11, ordering: 2 },
  { stageName: 'Collegiate', fromGrade: 12, toGrade: 13, ordering: 3 },
];

@Injectable()
export class GradeStageSeedService {
  constructor(
    @InjectRepository(GradeStageEntity)
    private readonly gradeStageRepository: Repository<GradeStageEntity>,
  ) {}

  async run(): Promise<void> {
    for (const stage of DEFAULT_STAGES) {
      const exists = await this.gradeStageRepository.findOne({
        where: { stageName: stage.stageName },
      });
      if (!exists) {
        await this.gradeStageRepository.save(this.gradeStageRepository.create(stage));
      }
    }
  }
}
