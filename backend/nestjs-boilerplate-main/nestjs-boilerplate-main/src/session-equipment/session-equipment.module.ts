import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEquipmentUsageEntity } from './entities/session-equipment-usage.entity';
import { EquipmentDamageReportEntity } from './entities/equipment-damage-report.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { EquipmentEntity } from '../equipment/entities/equipment.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { SessionEquipmentService } from './session-equipment.service';
import { DamageReportService } from './damage-report.service';
import { SessionEquipmentController } from './session-equipment.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';
import { EquipmentModule } from '../equipment/equipment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessionEquipmentUsageEntity,
      EquipmentDamageReportEntity,
      LabBookingEntity,
      LabEntity,
      EquipmentEntity,
      StaffEntity,
      StudentEntity,
      UserEntity,
    ]),
    UsersModule,
    StaffModule,
    NotificationModule,
    EquipmentModule,
  ],
  providers: [SessionEquipmentService, DamageReportService],
  controllers: [SessionEquipmentController],
  exports: [SessionEquipmentService],
})
export class SessionEquipmentModule {}
