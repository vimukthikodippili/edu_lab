import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ParentNotificationLogEntity } from '../communication/entities/parent-notification-log.entity';
import { MhaParentNotificationService } from './mha-parent-notification.service';
import { MhaParentNotificationController } from './mha-parent-notification.controller';
import { NotificationModule } from '../notification/notification.module';
import { SessionActionModule } from '../session-action/session-action.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MhaSessionEntity, StudentEntity, ParentNotificationLogEntity]),
    NotificationModule,
    SessionActionModule,
    AuditModule,
    UsersModule,
    StaffModule,
  ],
  providers: [MhaParentNotificationService],
  controllers: [MhaParentNotificationController],
})
export class MhaParentNotificationModule {}
