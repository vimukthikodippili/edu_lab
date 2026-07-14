import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BehavioralObservationEntity } from './entities/behavioral-observation.entity';
import { CounselorCaseEntity } from './entities/counselor-case.entity';
import { CounselorNoteEntity } from './entities/counselor-note.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { BehavioralObservationsService } from './behavioral-observations.service';
import { BehavioralObservationsController } from './behavioral-observations.controller';
import { CounselorCaseService } from './counselor-case.service';
import { CounselorCasesController } from './counselor-cases.controller';
import { CounselorNoteCryptoService } from './counselor-note-crypto.service';
import { CounselorNoteService } from './counselor-note.service';
import { CounselorNotesController } from './counselor-notes.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { MoodCheckInModule } from '../mood-check-in/mood-check-in.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BehavioralObservationEntity,
      CounselorCaseEntity,
      CounselorNoteEntity,
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
      UserEntity,
    ]),
    UsersModule,
    StaffModule,
    MoodCheckInModule,
    NotificationModule,
  ],
  providers: [
    BehavioralObservationsService,
    CounselorCaseService,
    CounselorNoteCryptoService,
    CounselorNoteService,
  ],
  controllers: [
    BehavioralObservationsController,
    CounselorCasesController,
    CounselorNotesController,
  ],
  exports: [BehavioralObservationsService, CounselorCaseService, CounselorNoteService],
})
export class CounselorModule {}
