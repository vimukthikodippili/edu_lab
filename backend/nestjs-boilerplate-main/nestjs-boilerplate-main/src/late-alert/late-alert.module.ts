import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LateAlertEntity } from './entities/late-alert.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { LiveClassMonitorModule } from '../live-class-monitor/live-class-monitor.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { LateAlertService } from './late-alert.service';
import { LateAlertController } from './late-alert.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LateAlertEntity, StaffEntity, UserEntity]),
    LiveClassMonitorModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [LateAlertService],
  controllers: [LateAlertController],
  exports: [LateAlertService],
})
export class LateAlertModule {}
