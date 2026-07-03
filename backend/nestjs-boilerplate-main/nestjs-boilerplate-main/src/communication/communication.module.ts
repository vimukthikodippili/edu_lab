import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyAlertEntity } from './entities/emergency-alert.entity';
import { NotificationLogEntity } from './entities/notification-log.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { NotificationModule } from '../notification/notification.module';
import { MailerModule } from '../mailer/mailer.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyAlertEntity,
      NotificationLogEntity,
      GuardianEntity,
      StudentGuardianEntity,
      StaffEntity,
    ]),
    NotificationModule,
    MailerModule,
    UsersModule,
    StaffModule,
  ],
  providers: [CommunicationService],
  controllers: [CommunicationController],
})
export class CommunicationModule {}
