import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventRegistrationEntity } from './entities/event-registration.entity';
import { EventTicketEntity } from './entities/event-ticket.entity';
import { EventAttendanceEntity } from './entities/event-attendance.entity';
import { EventStudentParticipantEntity } from './entities/event-student-participant.entity';
import { EventStudentAttendanceEntity } from './entities/event-student-attendance.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { EventService } from './event.service';
import { EventRegistrationService } from './event-registration.service';
import { EventAttendanceService } from './event-attendance.service';
import { EventParticipantService } from './event-participant.service';
import { EventController } from './event.controller';
import { EventRegistrationController } from './event-registration.controller';
import { EventAttendanceController } from './event-attendance.controller';
import { EventParticipantController } from './event-participant.controller';
import { AuditModule } from '../audit/audit.module';
import { CommunicationModule } from '../communication/communication.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      EventRegistrationEntity,
      EventTicketEntity,
      EventAttendanceEntity,
      EventStudentParticipantEntity,
      EventStudentAttendanceEntity,
      GuardianEntity,
      StudentGuardianEntity,
      StudentEntity,
      ClassSectionEntity,
    ]),
    AuditModule,
    CommunicationModule,
    NotificationModule,
    UsersModule,
    StaffModule,
  ],
  providers: [EventService, EventRegistrationService, EventAttendanceService, EventParticipantService],
  controllers: [EventController, EventRegistrationController, EventAttendanceController, EventParticipantController],
})
export class EventModule {}
