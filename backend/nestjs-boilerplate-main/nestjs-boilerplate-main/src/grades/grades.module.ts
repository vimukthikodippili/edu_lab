import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicTermEntity } from './entities/academic-term.entity';
import { TermAssessmentPlanEntity } from './entities/term-assessment-plan.entity';
import { AssessmentEntity } from './entities/assessment.entity';
import { MarkEntity } from './entities/mark.entity';
import { GradingBandEntity } from './entities/grading-band.entity';
import { SubjectResultEntity } from './entities/subject-result.entity';
import { TermResultEntity } from './entities/term-result.entity';
import { StudentGradeTrendEntity } from './entities/student-grade-trend.entity';
import { AcademicPatternFlagEntity } from './entities/academic-pattern-flag.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { AttendanceRecordEntity } from '../attendance/entities/attendance-record.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { StudentSubjectEnrollmentEntity } from '../enrollments/entities/student-subject-enrollment.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { AcademicTermsService } from './services/academic-terms.service';
import { TermAssessmentPlanService } from './services/term-assessment-plan.service';
import { AssessmentService } from './services/assessment.service';
import { MarkService } from './services/mark.service';
import { GradingBandService } from './services/grading-band.service';
import { ResultComputationService } from './services/result-computation.service';
import { ResultsQueryService } from './services/results-query.service';
import { ResultPublishingService } from './services/result-publishing.service';
import { ReportCardPdfService } from './services/report-card-pdf.service';
import { GradeTrendService } from './services/grade-trend.service';
import { ResultComputationListener } from './listeners/result-computation.listener';
import { ReportCardGenerationListener } from './listeners/report-card-generation.listener';
import { AcademicTermsController } from './controllers/academic-terms.controller';
import { TermAssessmentPlanController } from './controllers/term-assessment-plan.controller';
import { AssessmentController } from './controllers/assessment.controller';
import { MarkController } from './controllers/mark.controller';
import { GradingBandController } from './controllers/grading-band.controller';
import { ResultsController } from './controllers/results.controller';
import { GradeTrendController } from './controllers/grade-trend.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicTermEntity,
      TermAssessmentPlanEntity,
      AssessmentEntity,
      MarkEntity,
      SubjectEntity,
      StaffEntity,
      ClassSectionEntity,
      StudentEntity,
      TeacherSubjectClassRequirementEntity,
      StudentSubjectEnrollmentEntity,
      GradingBandEntity,
      SubjectResultEntity,
      TermResultEntity,
      StudentGradeTrendEntity,
      AcademicPatternFlagEntity,
      AttendanceRecordEntity,
      FileEntity,
    ]),
    UsersModule,
    StaffModule,
    NotificationModule,
  ],
  providers: [
    AcademicTermsService,
    TermAssessmentPlanService,
    AssessmentService,
    MarkService,
    GradingBandService,
    ResultComputationService,
    ResultsQueryService,
    ResultPublishingService,
    ReportCardPdfService,
    GradeTrendService,
    ResultComputationListener,
    ReportCardGenerationListener,
  ],
  controllers: [
    AcademicTermsController,
    TermAssessmentPlanController,
    AssessmentController,
    MarkController,
    GradingBandController,
    ResultsController,
    GradeTrendController,
  ],
  exports: [
    AcademicTermsService,
    TermAssessmentPlanService,
    AssessmentService,
    MarkService,
    GradingBandService,
    ResultComputationService,
    ResultPublishingService,
  ],
})
export class GradesModule {}
