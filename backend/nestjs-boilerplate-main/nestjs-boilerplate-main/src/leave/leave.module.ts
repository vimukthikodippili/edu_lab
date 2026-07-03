import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LeaveRequestEntity } from './entities/leave-request.entity';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveRequestEntity]),
    EventEmitterModule,
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [LeaveService],
  controllers: [LeaveController],
  exports: [LeaveService],
})
export class LeaveModule {}
