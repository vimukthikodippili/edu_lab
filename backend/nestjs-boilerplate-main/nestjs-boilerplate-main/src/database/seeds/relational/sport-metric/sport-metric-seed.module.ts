import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportMetricSeedService } from './sport-metric-seed.service';
import { SportMetricEntity } from '../../../../sports/entities/sport-metric.entity';
import { SportTypeEntity } from '../../../../sports/entities/sport-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SportMetricEntity, SportTypeEntity])],
  providers: [SportMetricSeedService],
  exports: [SportMetricSeedService],
})
export class SportMetricSeedModule {}
