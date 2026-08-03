import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamEntity } from './entities/exam.entity';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatEntity } from './entities/exam-seat.entity';
import { ExamSeatAllocationEntity } from './entities/exam-seat-allocation.entity';
import { AdmitCardEntity } from './entities/admit-card.entity';
import { ExamInvigilatorEntity } from './entities/exam-invigilator.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentSubjectEnrollmentEntity } from '../enrollments/entities/student-subject-enrollment.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { ExamService } from './exam.service';
import { ExamHallService } from './exam-hall.service';
import { ExamSeatAllocationService } from './exam-seat-allocation.service';
import { ExamInvigilatorService } from './exam-invigilator.service';
import { ExamHallPdfService } from './exam-hall-pdf.service';
import { ExamController } from './exam.controller';
import { ExamHallController } from './exam-hall.controller';
import { ExamSeatAllocationController } from './exam-seat-allocation.controller';
import { ExamInvigilatorController } from './exam-invigilator.controller';
import { ExamHallPdfController } from './exam-hall-pdf.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamEntity,
      ExamHallEntity,
      ExamSeatEntity,
      ExamSeatAllocationEntity,
      AdmitCardEntity,
      ExamInvigilatorEntity,
      StudentEntity,
      StudentSubjectEnrollmentEntity,
      GuardianEntity,
      StaffEntity,
    ]),
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [ExamService, ExamHallService, ExamSeatAllocationService, ExamInvigilatorService, ExamHallPdfService],
  controllers: [
    ExamController,
    ExamHallController,
    ExamSeatAllocationController,
    ExamInvigilatorController,
    ExamHallPdfController,
  ],
})
export class ExamHallsModule {}
