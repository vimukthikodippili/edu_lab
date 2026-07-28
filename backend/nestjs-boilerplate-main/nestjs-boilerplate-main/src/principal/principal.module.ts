import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecordEntity } from '../attendance/entities/attendance-record.entity';
import { InvoiceEntity } from '../fees/entities/invoice.entity';
import { FeeWaiverRequestEntity } from '../fees/entities/fee-waiver-request.entity';
import { EmergencyAlertEntity } from '../communication/entities/emergency-alert.entity';
import { LeaveRequestEntity } from '../leave/entities/leave-request.entity';
import { ExpenseApprovalEntity } from '../expenses/entities/expense-approval.entity';
import { CounselorCaseEntity } from '../counselor/entities/counselor-case.entity';
import { MhaCaseloadModule } from '../mha-caseload/mha-caseload.module';
import { PrincipalService } from './principal.service';
import { PrincipalController } from './principal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecordEntity,
      InvoiceEntity,
      FeeWaiverRequestEntity,
      EmergencyAlertEntity,
      LeaveRequestEntity,
      ExpenseApprovalEntity,
      CounselorCaseEntity,
    ]),
    MhaCaseloadModule,
  ],
  providers: [PrincipalService],
  controllers: [PrincipalController],
})
export class PrincipalModule {}
