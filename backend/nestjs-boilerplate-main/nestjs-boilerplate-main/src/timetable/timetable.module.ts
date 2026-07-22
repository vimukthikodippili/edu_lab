import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimetableEntryEntity } from './entities/timetable-entry.entity';
import { TimetableRecordEntity } from './entities/timetable-record.entity';
import { SubstituteAssignmentEntity } from './entities/substitute-assignment.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { LeaveRequestEntity } from '../leave/entities/leave-request.entity';
import { SchoolCalendarConfigModule } from '../school-calendar-config/school-calendar-config.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { StudentsModule } from '../students/students.module';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';
import { SubstituteService } from './substitute.service';
import { SubstituteController } from './substitute.controller';
import { SubstituteSuggestionListener } from './listeners/substitute-suggestion.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimetableEntryEntity,
      TimetableRecordEntity,
      SubstituteAssignmentEntity,
      TeacherSubjectClassRequirementEntity,
      ClassSectionEntity,
      StaffEntity,
      UserEntity,
      LeaveRequestEntity,
    ]),
    SchoolCalendarConfigModule,
    NotificationModule,
    UsersModule,
    StaffModule,
    StudentsModule,
  ],
  providers: [TimetableService, SubstituteService, SubstituteSuggestionListener],
  controllers: [TimetableController, SubstituteController],
  exports: [TimetableService, SubstituteService],
})
export class TimetableModule {}
