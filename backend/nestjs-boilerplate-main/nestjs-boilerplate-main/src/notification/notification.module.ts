import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from './entities/in-app-notification.entity';
import { GuardianNotificationEntity } from './entities/guardian-notification.entity';
import { NotificationService } from './notification.service';
import { NotificationHandler } from './notification.handler';
import { NotificationController } from './notification.controller';
import { AbsenceNotificationListener } from './listeners/absence-notification.listener';
import { SmsService } from './sms/sms.service';
import { PushService } from './push/push.service';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InAppNotificationEntity,
      GuardianNotificationEntity,
      StudentEntity,
      ClassSectionEntity,
    ]),
  ],
  providers: [
    NotificationService,
    NotificationHandler,
    AbsenceNotificationListener,
    SmsService,
    PushService,
  ],
  controllers: [NotificationController],
  exports: [NotificationService, SmsService, PushService],
})
export class NotificationModule {}
