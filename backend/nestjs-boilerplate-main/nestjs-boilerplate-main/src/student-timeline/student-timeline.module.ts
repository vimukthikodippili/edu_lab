import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEntity } from '../students/entities/student.entity';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { RiskSummaryEntity } from '../risk-summary/entities/risk-summary.entity';
import { StudentTimelineService } from './student-timeline.service';
import { StudentTimelineController } from './student-timeline.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudentEntity, MhaSessionEntity, RiskSummaryEntity])],
  providers: [StudentTimelineService],
  controllers: [StudentTimelineController],
})
export class StudentTimelineModule {}
