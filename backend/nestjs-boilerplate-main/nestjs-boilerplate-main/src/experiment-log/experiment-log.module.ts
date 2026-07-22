import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperimentLogEntity } from './entities/experiment-log.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { ExperimentLogService } from './experiment-log.service';
import { ExperimentLogController } from './experiment-log.controller';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExperimentLogEntity, LabBookingEntity, LabEntity, FileEntity]),
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [ExperimentLogService],
  controllers: [ExperimentLogController],
  exports: [ExperimentLogService],
})
export class ExperimentLogModule {}
