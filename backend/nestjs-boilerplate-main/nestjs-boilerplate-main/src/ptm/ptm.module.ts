import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PTMEventEntity } from './entities/ptm-event.entity';
import { PTMTeacherAvailabilityEntity } from './entities/ptm-teacher-availability.entity';
import { PTMSlotEntity } from './entities/ptm-slot.entity';
import { PTMBookingEntity } from './entities/ptm-booking.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { PTMEventService } from './ptm-event.service';
import { PTMBookingService } from './ptm-booking.service';
import { PTMEventController } from './ptm-event.controller';
import { PTMBookingController } from './ptm-booking.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PTMEventEntity,
      PTMTeacherAvailabilityEntity,
      PTMSlotEntity,
      PTMBookingEntity,
      GuardianEntity,
      StudentEntity,
      StudentGuardianEntity,
    ]),
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [PTMEventService, PTMBookingService],
  controllers: [PTMEventController, PTMBookingController],
})
export class PtmModule {}
