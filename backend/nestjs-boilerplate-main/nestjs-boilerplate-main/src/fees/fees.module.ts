import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeeStructureEntity } from './entities/fee-structure.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { FeeWaiverRequestEntity } from './entities/fee-waiver-request.entity';
import { GradeEntity } from '../students/entities/grade.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { AuditModule } from '../audit/audit.module';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeeStructureEntity,
      InvoiceEntity,
      FeeWaiverRequestEntity,
      GradeEntity,
      StudentEntity,
      AcademicTermEntity,
      StaffEntity,
    ]),
    NotificationModule,
    UsersModule,
    StaffModule,
    AuditModule,
  ],
  providers: [FeesService],
  controllers: [FeesController],
  exports: [FeesService],
})
export class FeesModule {}
