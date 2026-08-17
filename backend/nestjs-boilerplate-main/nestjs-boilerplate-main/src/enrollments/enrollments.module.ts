import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ALStreamEntity } from './entities/al-stream.entity';
import { ALStreamSubjectEntity } from './entities/al-stream-subject.entity';
import { StudentSubjectEnrollmentEntity } from './entities/student-subject-enrollment.entity';
import {
  SubjectSelectionWindowCoreSubjectEntity,
  SubjectSelectionWindowOptionalSubjectEntity,
} from './entities/subject-selection-window-subject.entity';
import { SubjectSelectionWindowEntity } from './entities/subject-selection-window.entity';
import { SubjectSelectionRequestEntity } from './entities/subject-selection-request.entity';
import { SubjectSelectionRequestItemEntity } from './entities/subject-selection-request-item.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { CareerAssessmentEntity } from '../career/entities/career-assessment.entity';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { SubjectSelectionWindowService } from './subject-selection-window.service';
import { SubjectSelectionWindowController } from './subject-selection-window.controller';
import { SubjectSelectionService } from './subject-selection.service';
import { SubjectSelectionController } from './subject-selection.controller';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ALStreamEntity,
      ALStreamSubjectEntity,
      StudentSubjectEnrollmentEntity,
      SubjectSelectionWindowEntity,
      SubjectSelectionWindowCoreSubjectEntity,
      SubjectSelectionWindowOptionalSubjectEntity,
      SubjectSelectionRequestEntity,
      SubjectSelectionRequestItemEntity,
      SubjectEntity,
      StudentEntity,
      CareerAssessmentEntity,
    ]),
    EventEmitterModule,
    AuditModule,
    NotificationModule,
    UsersModule,
    StaffModule,
    StudentsModule,
  ],
  providers: [EnrollmentsService, SubjectSelectionWindowService, SubjectSelectionService],
  controllers: [EnrollmentsController, SubjectSelectionWindowController, SubjectSelectionController],
  exports: [EnrollmentsService, SubjectSelectionWindowService, SubjectSelectionService],
})
export class EnrollmentsModule {}
