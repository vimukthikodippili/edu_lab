import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarkEntity } from '../grades/entities/mark.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { TeacherTasksService } from './teacher-tasks.service';
import { TeacherTasksController } from './teacher-tasks.controller';
import { LessonPlanModule } from '../lesson-plan/lesson-plan.module';
import { ClassDiaryModule } from '../class-diary/class-diary.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarkEntity,
      AssessmentEntity,
      TeacherSubjectClassRequirementEntity,
      TimetableEntryEntity,
    ]),
    LessonPlanModule,
    ClassDiaryModule,
    UsersModule,
    StaffModule,
  ],
  providers: [TeacherTasksService],
  controllers: [TeacherTasksController],
  exports: [TeacherTasksService],
})
export class TeacherTasksModule {}
