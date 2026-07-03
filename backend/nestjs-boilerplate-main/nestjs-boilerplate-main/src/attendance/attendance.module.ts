import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecordEntity } from './entities/attendance-record.entity';
import { SchoolHolidayEntity } from './entities/school-holiday.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { SchoolCalendarConfigModule } from '../school-calendar-config/school-calendar-config.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { AttendanceService } from './attendance.service';
import { AttendanceReportService } from './attendance-report.service';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecordEntity,
      SchoolHolidayEntity,
      StudentEntity,
      ClassSectionEntity,
      TeacherSubjectClassRequirementEntity,
    ]),
    SchoolCalendarConfigModule,
    UsersModule,
    StaffModule,
  ],
  providers: [AttendanceService, AttendanceReportService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
