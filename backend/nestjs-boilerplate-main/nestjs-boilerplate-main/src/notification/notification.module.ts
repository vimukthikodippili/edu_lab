import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationEntity } from './entities/in-app-notification.entity';
import { NotificationService } from './notification.service';
import { NotificationHandler } from './notification.handler';
import { NotificationController } from './notification.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InAppNotificationEntity])],
  providers: [NotificationService, NotificationHandler],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
