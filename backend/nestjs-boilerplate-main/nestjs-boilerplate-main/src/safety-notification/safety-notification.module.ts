import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationDeliveryLogEntity } from './entities/notification-delivery-log.entity';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { SafetyNotificationQueueService } from './safety-notification-queue.service';
import { SafetyAlertsService } from './safety-alerts.service';
import { SafetyAlertsController } from './safety-alerts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationDeliveryLogEntity,
      MhaSessionEntity,
      StudentEntity,
      StaffEntity,
    ]),
  ],
  providers: [SafetyNotificationQueueService, SafetyAlertsService],
  controllers: [SafetyAlertsController],
  exports: [SafetyNotificationQueueService],
})
export class SafetyNotificationModule {}
