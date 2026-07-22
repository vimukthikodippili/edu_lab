import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabReportAssignmentEntity } from './entities/lab-report-assignment.entity';
import { LabReportSubmissionEntity } from './entities/lab-report-submission.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { MarkEntity } from '../grades/entities/mark.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { LabReportAssignmentService } from './lab-report-assignment.service';
import { LabReportSubmissionService } from './lab-report-submission.service';
import { LabReportsController } from './lab-reports.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LabReportAssignmentEntity,
      LabReportSubmissionEntity,
      ExperimentLogEntity,
      AcademicTermEntity,
      AssessmentEntity,
      MarkEntity,
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
      StaffEntity,
      FileEntity,
    ]),
    UsersModule,
    StaffModule,
    NotificationModule,
  ],
  providers: [LabReportAssignmentService, LabReportSubmissionService],
  controllers: [LabReportsController],
  exports: [LabReportAssignmentService, LabReportSubmissionService],
})
export class LabReportsModule {}
