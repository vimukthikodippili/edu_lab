import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEntity } from './entities/sport.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SportEnrollmentEntity } from './entities/sport-enrollment.entity';
import { SportMetricEntity } from './entities/sport-metric.entity';
import { MatchEntity } from './entities/match.entity';
import { StudentMatchPerformanceEntity } from './entities/student-match-performance.entity';
import { TrainingSessionEntity } from './entities/training-session.entity';
import { SportStudentSnapshotEntity } from './entities/sport-student-snapshot.entity';
import { CoachAlertEntity } from './entities/coach-alert.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { SportsService } from './sports.service';
import { SportsController } from './sports.controller';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { SnapshotService } from './snapshot.service';
import { SnapshotController } from './snapshot.controller';
import { StudentSportsService } from './student-sports.service';
import { StudentSportsController } from './student-sports.controller';
import { SportTypeService } from './sport-type.service';
import { SportTypeController } from './sport-type.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SportEntity,
      SportTypeEntity,
      SportEnrollmentEntity,
      SportMetricEntity,
      MatchEntity,
      StudentMatchPerformanceEntity,
      TrainingSessionEntity,
      SportStudentSnapshotEntity,
      CoachAlertEntity,
      StaffEntity,
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
    ]),
    UsersModule,
    StaffModule,
    NotificationModule,
    SchoolSettingsModule,
  ],
  providers: [
    SportsService,
    PerformanceService,
    SnapshotService,
    StudentSportsService,
    SportTypeService,
  ],
  controllers: [
    SportsController,
    PerformanceController,
    SnapshotController,
    StudentSportsController,
    SportTypeController,
  ],
  exports: [SportsService],
})
export class SportsModule {}
