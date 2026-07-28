import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskSummaryEntity } from './entities/risk-summary.entity';
import { RiskAggregationService } from './risk-aggregation.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiskSummaryEntity])],
  providers: [RiskAggregationService],
  exports: [RiskAggregationService],
})
export class RiskSummaryModule {}
