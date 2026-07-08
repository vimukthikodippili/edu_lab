import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnualLessonPlanEntryEntity } from './entities/annual-lesson-plan-entry.entity';
import { AnnualLessonPlanSubmissionEntity } from './entities/annual-lesson-plan-submission.entity';
import { MonthEndSummaryEntity } from './entities/month-end-summary.entity';
import { TimetableRecordEntity } from '../timetable/entities/timetable-record.entity';
import { SyllabusUnitEntity } from '../syllabus/entities/syllabus-unit.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { LessonPlanService } from './lesson-plan.service';
import { LessonPlanController } from './lesson-plan.controller';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnnualLessonPlanEntryEntity,
      AnnualLessonPlanSubmissionEntity,
      MonthEndSummaryEntity,
      TimetableRecordEntity,
      SyllabusUnitEntity,
      SubjectEntity,
      StaffEntity,
      UserEntity,
    ]),
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [LessonPlanService],
  controllers: [LessonPlanController],
  exports: [LessonPlanService],
})
export class LessonPlanModule {}
