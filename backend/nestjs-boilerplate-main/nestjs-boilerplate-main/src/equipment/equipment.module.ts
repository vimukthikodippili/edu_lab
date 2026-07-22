import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentCategoryEntity } from './entities/equipment-category.entity';
import { EquipmentEntity } from './entities/equipment.entity';
import { EquipmentConditionHistoryEntity } from './entities/equipment-condition-history.entity';
import { EquipmentWriteOffEntity } from './entities/equipment-write-off.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { LabTypeEntity } from '../labs/entities/lab-type.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { EquipmentCategoryService } from './equipment-category.service';
import { EquipmentService } from './equipment.service';
import { EquipmentStockAlertService } from './equipment-stock-alert.service';
import { EquipmentInventoryReportService } from './equipment-inventory-report.service';
import { EquipmentCategoryController } from './equipment-category.controller';
import { EquipmentController } from './equipment.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentCategoryEntity,
      EquipmentEntity,
      EquipmentConditionHistoryEntity,
      EquipmentWriteOffEntity,
      LabEntity,
      LabTypeEntity,
      StaffEntity,
    ]),
    UsersModule,
    StaffModule,
    NotificationModule,
  ],
  providers: [
    EquipmentCategoryService,
    EquipmentService,
    EquipmentStockAlertService,
    EquipmentInventoryReportService,
  ],
  controllers: [EquipmentCategoryController, EquipmentController],
  exports: [EquipmentService, EquipmentStockAlertService],
})
export class EquipmentModule {}
