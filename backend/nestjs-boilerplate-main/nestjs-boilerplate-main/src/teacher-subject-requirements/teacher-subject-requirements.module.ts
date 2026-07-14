import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubjectClassRequirementEntity } from './entities/teacher-subject-class-requirement.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { SchoolCalendarConfigModule } from '../school-calendar-config/school-calendar-config.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { TeacherSubjectRequirementsService } from './teacher-subject-requirements.service';
import { TeacherSubjectRequirementsController } from './teacher-subject-requirements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeacherSubjectClassRequirementEntity,
      StaffEntity,
      SubjectEntity,
      ClassSectionEntity,
    ]),
    SchoolCalendarConfigModule,
    UsersModule,
    StaffModule,
  ],
  providers: [TeacherSubjectRequirementsService],
  controllers: [TeacherSubjectRequirementsController],
  exports: [TeacherSubjectRequirementsService],
})
export class TeacherSubjectRequirementsModule {}
