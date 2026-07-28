import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { SessionActionEntity } from '../session-action/entities/session-action.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { MhaHistoryService } from './mha-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MhaSessionEntity, StudentEntity, RiskSummaryEntity, SessionActionEntity, StaffEntity]),
  ],
  providers: [MhaHistoryService],
  exports: [MhaHistoryService],
})
export class MhaHistoryModule {}
