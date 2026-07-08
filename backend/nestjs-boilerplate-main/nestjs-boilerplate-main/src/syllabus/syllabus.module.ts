import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyllabusUnitEntity } from './entities/syllabus-unit.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { GradeEntity } from '../students/entities/grade.entity';
import { SyllabusService } from './syllabus.service';
import { SyllabusController } from './syllabus.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyllabusUnitEntity, SubjectEntity, GradeEntity]),
  ],
  providers: [SyllabusService],
  controllers: [SyllabusController],
  exports: [SyllabusService],
})
export class SyllabusModule {}
