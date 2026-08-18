import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from './entities/in-app-notification.entity';
import { GuardianNotificationEntity } from './entities/guardian-notification.entity';
import { StudentNotificationEntity } from './entities/student-notification.entity';
import { NotificationService } from './notification.service';
import { NotificationHandler } from './notification.handler';
import { NotificationController } from './notification.controller';
import { AbsenceNotificationListener } from './listeners/absence-notification.listener';
import { SmsService } from './sms/sms.service';
import { PushService } from './push/push.service';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InAppNotificationEntity,
      GuardianNotificationEntity,
      StudentNotificationEntity,
      StudentEntity,
      ClassSectionEntity,
      GuardianEntity,
    ]),
    UsersModule,
    StaffModule,
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
