import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentCategorySeedService } from './equipment-category-seed.service';
import { EquipmentCategoryEntity } from '../../../../equipment/entities/equipment-category.entity';
import { LabTypeEntity } from '../../../../labs/entities/lab-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentCategoryEntity, LabTypeEntity])],
  providers: [EquipmentCategorySeedService],
  exports: [EquipmentCategorySeedService],
})
export class EquipmentCategorySeedModule {}
