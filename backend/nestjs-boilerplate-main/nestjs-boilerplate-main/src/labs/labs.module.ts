import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabTypeEntity } from './entities/lab-type.entity';
import { LabEntity } from './entities/lab.entity';
import { LabBookingEntity } from './entities/lab-booking.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { LabTypeService } from './lab-type.service';
import { LabService } from './lab.service';
import { LabBookingService } from './lab-booking.service';
import { LabTypeController } from './lab-type.controller';
import { LabController } from './lab.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LabTypeEntity,
      LabEntity,
      LabBookingEntity,
      StaffEntity,
      TimetableEntryEntity,
      ClassSectionEntity,
      SubjectEntity,
      AcademicTermEntity,
    ]),
    UsersModule,
    StaffModule,
    NotificationModule,
  ],
  providers: [LabTypeService, LabService, LabBookingService],
  controllers: [LabTypeController, LabController],
  exports: [LabService],
})
export class LabsModule {}
