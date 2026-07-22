import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabEntity } from '../labs/entities/lab.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { EquipmentEntity } from '../equipment/entities/equipment.entity';
import { EquipmentDamageReportEntity } from '../session-equipment/entities/equipment-damage-report.entity';
import { ExperimentLogEntity } from '../experiment-log/entities/experiment-log.entity';
import { LabReportAssignmentEntity } from '../lab-reports/entities/lab-report-assignment.entity';
import { LabReportSubmissionEntity } from '../lab-reports/entities/lab-report-submission.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { LabOverviewService } from './lab-overview.service';
import { LabOverviewController } from './lab-overview.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LabEntity,
      LabBookingEntity,
      EquipmentEntity,
      EquipmentDamageReportEntity,
      ExperimentLogEntity,
      LabReportAssignmentEntity,
      LabReportSubmissionEntity,
      StudentEntity,
    ]),
  ],
  providers: [LabOverviewService],
  controllers: [LabOverviewController],
  exports: [LabOverviewService],
})
export class LabOverviewModule {}
