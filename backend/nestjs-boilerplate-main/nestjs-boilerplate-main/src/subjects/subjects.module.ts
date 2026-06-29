import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectCategoryEntity } from './entities/subject-category.entity';
import { SubjectEntity } from './entities/subject.entity';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubjectEntity, SubjectCategoryEntity])],
  providers: [SubjectsService],
  controllers: [SubjectsController],
  exports: [SubjectsService], // downstream modules (Timetable, Exams) will inject this
})
export class SubjectsModule {}
