import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableEntryEntity } from './entities/timetable-entry.entity';
import { TimetableRecordEntity } from './entities/timetable-record.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { SchoolCalendarConfigModule } from '../school-calendar-config/school-calendar-config.module';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimetableEntryEntity,
      TimetableRecordEntity,
      TeacherSubjectClassRequirementEntity,
      ClassSectionEntity,
    ]),
    SchoolCalendarConfigModule,
  ],
  providers: [TimetableService],
  controllers: [TimetableController],
  exports: [TimetableService],
})
export class TimetableModule {}
