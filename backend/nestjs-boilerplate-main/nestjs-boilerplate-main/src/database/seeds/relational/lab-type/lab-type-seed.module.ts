import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabTypeSeedService } from './lab-type-seed.service';
import { LabTypeEntity } from '../../../../labs/entities/lab-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LabTypeEntity])],
  providers: [LabTypeSeedService],
  exports: [LabTypeSeedService],
})
export class LabTypeSeedModule {}
