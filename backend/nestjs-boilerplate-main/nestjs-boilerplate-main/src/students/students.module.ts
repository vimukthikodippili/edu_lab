import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentDocumentsController } from './student-documents.controller';
import { GradeStageController } from './grade-stage.controller';
import { StudentsService } from './students.service';
import { StudentPromotionService } from './services/student-promotion.service';
import { StudentDocumentsService } from './services/student-documents.service';
import { StudentDocumentPdfService } from './services/student-document-pdf.service';
import { GradeStageService } from './grade-stage.service';
import { StudentEntity } from './entities/student.entity';
import { GuardianEntity } from './entities/guardian.entity';
import { StudentGuardianEntity } from './entities/student-guardian.entity';
import { GradeEntity } from './entities/grade.entity';
import { GradeStageEntity } from './entities/grade-stage.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { StudentEnrollmentHistoryEntity } from './entities/student-enrollment-history.entity';
import { StudentDocumentEntity } from './entities/student-document.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { StudentNotesModule } from '../student-notes/student-notes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
      GradeEntity,
      GradeStageEntity,
      ClassSectionEntity,
      StudentEnrollmentHistoryEntity,
      StudentDocumentEntity,
      FileEntity,
      StaffEntity,
    ]),
    UsersModule,
    StaffModule,
    StudentNotesModule,
  ],
  controllers: [StudentsController, StudentDocumentsController, GradeStageController],
  providers: [
    StudentsService,
    StudentPromotionService,
    StudentDocumentsService,
    StudentDocumentPdfService,
    GradeStageService,
  ],
  exports: [StudentsService, StudentPromotionService, GradeStageService],
})
export class StudentsModule {}
