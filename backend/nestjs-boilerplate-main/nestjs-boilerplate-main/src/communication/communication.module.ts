import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyAlertEntity } from './entities/emergency-alert.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { TargetedMessageEntity } from './entities/targeted-message.entity';
import { TargetedMessageRecipientEntity } from './entities/targeted-message-recipient.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { TargetedMessageService } from './targeted-message.service';
import { TargetedMessageController } from './targeted-message.controller';
import { NotificationModule } from '../notification/notification.module';
import { MailerModule } from '../mailer/mailer.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyAlertEntity,
      NotificationLogEntity,
      TargetedMessageEntity,
      TargetedMessageRecipientEntity,
      GuardianEntity,
      StudentGuardianEntity,
      StudentEntity,
      ClassSectionEntity,
      StaffEntity,
      TimetableEntryEntity,
    ]),
    NotificationModule,
    MailerModule,
    UsersModule,
    StaffModule,
  ],
  providers: [CommunicationService, TargetedMessageService],
  controllers: [CommunicationController, TargetedMessageController],
  exports: [CommunicationService, TargetedMessageService],
})
export class CommunicationModule {}
