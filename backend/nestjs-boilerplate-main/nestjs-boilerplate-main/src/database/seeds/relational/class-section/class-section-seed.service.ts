import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSectionEntity } from '../../../../students/entities/class-section.entity';
import { GradeEntity } from '../../../../students/entities/grade.entity';

const SECTIONS = ['A', 'B', 'C'];
const ACADEMIC_YEAR = String(new Date().getFullYear());

@Injectable()
export class ClassSectionSeedService {
  constructor(
    @InjectRepository(ClassSectionEntity)
    private readonly sectionRepository: Repository<ClassSectionEntity>,

    @InjectRepository(GradeEntity)
    private readonly gradeRepository: Repository<GradeEntity>,
  ) {}

  async run(): Promise<void> {
    const grades = await this.gradeRepository.find();

    for (const grade of grades) {
      for (const sectionName of SECTIONS) {
        const exists = await this.sectionRepository.findOne({
          where: { gradeId: grade.id, name: sectionName, academicYear: ACADEMIC_YEAR },
        });
        if (!exists) {
          await this.sectionRepository.save(
            this.sectionRepository.create({
              name: sectionName,
              academicYear: ACADEMIC_YEAR,
              gradeId: grade.id,
            }),
          );
        }
      }
    }
  }
}
