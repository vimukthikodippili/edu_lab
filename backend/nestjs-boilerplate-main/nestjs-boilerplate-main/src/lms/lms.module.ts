import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentEntity } from './entities/assignment.entity';
import { SubmissionEntity } from './entities/submission.entity';
import { LiveSessionEntity } from './entities/live-session.entity';
import { LiveSessionAttendanceEntity } from './entities/live-session-attendance.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { AttendanceRecordEntity } from '../attendance/entities/attendance-record.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveKitService } from './livekit.service';
import { LiveKitEgressService } from './livekit-egress.service';
import { LiveAttendanceService } from './live-attendance.service';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentEntity,
      SubmissionEntity,
      LiveSessionEntity,
      LiveSessionAttendanceEntity,
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
      TeacherSubjectClassRequirementEntity,
      FileEntity,
      AttendanceRecordEntity,
    ]),
    UsersModule,
    StaffModule,
  ],
  providers: [
    AssignmentsService,
    SubmissionsService,
    LiveSessionsService,
    LiveKitService,
    LiveKitEgressService,
    LiveAttendanceService,
  ],
  controllers: [AssignmentsController, SubmissionsController, LiveSessionsController],
  exports: [
    AssignmentsService,
    SubmissionsService,
    LiveSessionsService,
    LiveKitService,
    LiveKitEgressService,
    LiveAttendanceService,
  ],
})
export class LmsModule {}
