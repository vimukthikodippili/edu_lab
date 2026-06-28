import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeEntity, GradeStage } from '../../../../students/entities/grade.entity';

const GRADES: { level: number; name: string; stage: GradeStage }[] = [
  { level: 1,  name: 'Grade 1',  stage: GradeStage.PRIMARY },
  { level: 2,  name: 'Grade 2',  stage: GradeStage.PRIMARY },
  { level: 3,  name: 'Grade 3',  stage: GradeStage.PRIMARY },
  { level: 4,  name: 'Grade 4',  stage: GradeStage.PRIMARY },
  { level: 5,  name: 'Grade 5',  stage: GradeStage.PRIMARY },
  { level: 6,  name: 'Grade 6',  stage: GradeStage.JUNIOR_SECONDARY },
  { level: 7,  name: 'Grade 7',  stage: GradeStage.JUNIOR_SECONDARY },
  { level: 8,  name: 'Grade 8',  stage: GradeStage.JUNIOR_SECONDARY },
  { level: 9,  name: 'Grade 9',  stage: GradeStage.JUNIOR_SECONDARY },
  { level: 10, name: 'Grade 10', stage: GradeStage.SENIOR_SECONDARY },
  { level: 11, name: 'Grade 11', stage: GradeStage.SENIOR_SECONDARY },
  { level: 12, name: 'Grade 12', stage: GradeStage.COLLEGIATE },
  { level: 13, name: 'Grade 13', stage: GradeStage.COLLEGIATE },
];

@Injectable()
export class GradeSeedService {
  constructor(
    @InjectRepository(GradeEntity)
    private readonly gradeRepository: Repository<GradeEntity>,
  ) {}

  async run(): Promise<void> {
    for (const grade of GRADES) {
      const exists = await this.gradeRepository.findOne({ where: { level: grade.level } });
      if (!exists) {
        await this.gradeRepository.save(this.gradeRepository.create(grade));
      }
    }
  }
}
