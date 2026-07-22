import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GradeEntity } from '../../../../students/entities/grade.entity';

const GRADES: { level: number; name: string }[] = [
  { level: 1,  name: 'Grade 1' },
  { level: 2,  name: 'Grade 2' },
  { level: 3,  name: 'Grade 3' },
  { level: 4,  name: 'Grade 4' },
  { level: 5,  name: 'Grade 5' },
  { level: 6,  name: 'Grade 6' },
  { level: 7,  name: 'Grade 7' },
  { level: 8,  name: 'Grade 8' },
  { level: 9,  name: 'Grade 9' },
  { level: 10, name: 'Grade 10' },
  { level: 11, name: 'Grade 11' },
  { level: 12, name: 'Grade 12' },
  { level: 13, name: 'Grade 13' },
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
