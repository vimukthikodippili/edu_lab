import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BehavioralObservationEntity } from './entities/behavioral-observation.entity';
import { CounselorCaseEntity } from './entities/counselor-case.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { BehavioralObservationsService } from './behavioral-observations.service';
import { BehavioralObservationsController } from './behavioral-observations.controller';
import { CounselorCaseService } from './counselor-case.service';
import { CounselorCasesController } from './counselor-cases.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { MoodCheckInModule } from '../mood-check-in/mood-check-in.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BehavioralObservationEntity,
      CounselorCaseEntity,
      StudentEntity,
      UserEntity,
    ]),
    UsersModule,
    StaffModule,
    MoodCheckInModule,
    NotificationModule,
  ],
  providers: [BehavioralObservationsService, CounselorCaseService],
  controllers: [BehavioralObservationsController, CounselorCasesController],
  exports: [BehavioralObservationsService, CounselorCaseService],
})
export class CounselorModule {}
