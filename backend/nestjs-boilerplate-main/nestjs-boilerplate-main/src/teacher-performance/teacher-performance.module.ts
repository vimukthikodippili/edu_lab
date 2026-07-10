import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffAttendanceEntity } from '../attendance/entities/staff-attendance.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { MarkEntity } from '../grades/entities/mark.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { AnnualLessonPlanEntryEntity } from '../lesson-plan/entities/annual-lesson-plan-entry.entity';
import { TeacherPerformanceSnapshotEntity } from './entities/teacher-performance-snapshot.entity';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { TeacherPerformanceService } from './teacher-performance.service';
import { TeacherPerformanceController } from './teacher-performance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffAttendanceEntity,
      TeacherSubjectClassRequirementEntity,
      AssessmentEntity,
      MarkEntity,
      SubjectEntity,
      ClassSectionEntity,
      AnnualLessonPlanEntryEntity,
      TeacherPerformanceSnapshotEntity,
    ]),
    UsersModule,
    StaffModule,
  ],
  providers: [TeacherPerformanceService],
  controllers: [TeacherPerformanceController],
})
export class TeacherPerformanceModule {}
