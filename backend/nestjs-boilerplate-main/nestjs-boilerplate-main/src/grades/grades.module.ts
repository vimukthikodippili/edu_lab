import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicTermEntity } from './entities/academic-term.entity';
import { AcademicYearEntity } from './entities/academic-year.entity';
import { TermAssessmentPlanEntity } from './entities/term-assessment-plan.entity';
import { AssessmentEntity } from './entities/assessment.entity';
import { MarkEntity } from './entities/mark.entity';
import { MarkTopicScoreEntity } from './entities/mark-topic-score.entity';
import { MarkCorrectionRequestEntity } from './entities/mark-correction-request.entity';
import { GradingBandEntity } from './entities/grading-band.entity';
import { SubjectResultEntity } from './entities/subject-result.entity';
import { TermResultEntity } from './entities/term-result.entity';
import { StudentGradeTrendEntity } from './entities/student-grade-trend.entity';
import { AcademicPatternFlagEntity } from './entities/academic-pattern-flag.entity';
import { AssessmentMaterialsCheckEntity } from './entities/assessment-materials-check.entity';
import { AssessmentTopicAllocationEntity } from './entities/assessment-topic-allocation.entity';
import { TopicWeaknessFlagEntity } from './entities/topic-weakness-flag.entity';
import { TopicTermSnapshotEntity } from './entities/topic-term-snapshot.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { AttendanceRecordEntity } from '../attendance/entities/attendance-record.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { StudentSubjectEnrollmentEntity } from '../enrollments/entities/student-subject-enrollment.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { AcademicTermsService } from './services/academic-terms.service';
import { AcademicYearsService } from './services/academic-years.service';
import { TermAssessmentPlanService } from './services/term-assessment-plan.service';
import { AssessmentService } from './services/assessment.service';
import { MarkService } from './services/mark.service';
import { MarkCorrectionService } from './services/mark-correction.service';
import { MaterialsCheckService } from './services/materials-check.service';
import { GradingBandService } from './services/grading-band.service';
import { ResultComputationService } from './services/result-computation.service';
import { ResultsQueryService } from './services/results-query.service';
import { ResultPublishingService } from './services/result-publishing.service';
import { ReportCardPdfService } from './services/report-card-pdf.service';
import { GradeTrendService } from './services/grade-trend.service';
import { TopicWeaknessService } from './services/topic-weakness.service';
import { StudentSummaryService } from './services/student-summary.service';
import { PerformanceTrendService } from './services/performance-trend.service';
import { ResultComputationListener } from './listeners/result-computation.listener';
import { ReportCardGenerationListener } from './listeners/report-card-generation.listener';
import { TopicSnapshotListener } from './listeners/topic-snapshot.listener';
import { AcademicTermsController } from './controllers/academic-terms.controller';
import { AcademicYearsController } from './controllers/academic-years.controller';
import { TermAssessmentPlanController } from './controllers/term-assessment-plan.controller';
import { AssessmentController } from './controllers/assessment.controller';
import { MarkController } from './controllers/mark.controller';
import { MarkCorrectionController } from './controllers/mark-correction.controller';
import { MaterialsCheckController } from './controllers/materials-check.controller';
import { GradingBandController } from './controllers/grading-band.controller';
import { ResultsController } from './controllers/results.controller';
import { GradeTrendController } from './controllers/grade-trend.controller';
import { TopicWeaknessController } from './controllers/topic-weakness.controller';
import { StudentSummaryController } from './controllers/student-summary.controller';
import { PerformanceTrendController } from './controllers/performance-trend.controller';
import { UsersModule } from '../users/users.module';
import { StaffModule } from '../staff/staff.module';
import { NotificationModule } from '../notification/notification.module';
import { SubjectTopicsModule } from '../subject-topics/subject-topics.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademicTermEntity,
      AcademicYearEntity,
      TermAssessmentPlanEntity,
      AssessmentEntity,
      MarkEntity,
      MarkTopicScoreEntity,
      MarkCorrectionRequestEntity,
      SubjectEntity,
      StaffEntity,
      ClassSectionEntity,
      StudentEntity,
      GuardianEntity,
      StudentGuardianEntity,
      TeacherSubjectClassRequirementEntity,
      StudentSubjectEnrollmentEntity,
      GradingBandEntity,
      SubjectResultEntity,
      TermResultEntity,
      StudentGradeTrendEntity,
      AcademicPatternFlagEntity,
      AssessmentMaterialsCheckEntity,
      AssessmentTopicAllocationEntity,
      TopicWeaknessFlagEntity,
      TopicTermSnapshotEntity,
      AttendanceRecordEntity,
      FileEntity,
    ]),
    UsersModule,
    StaffModule,
    NotificationModule,
    SubjectTopicsModule,
    AuditModule,
  ],
  providers: [
    AcademicTermsService,
    AcademicYearsService,
    TermAssessmentPlanService,
    AssessmentService,
    MarkService,
    MarkCorrectionService,
    MaterialsCheckService,
    GradingBandService,
    ResultComputationService,
    ResultsQueryService,
    ResultPublishingService,
    ReportCardPdfService,
    GradeTrendService,
    TopicWeaknessService,
    StudentSummaryService,
    PerformanceTrendService,
    ResultComputationListener,
    ReportCardGenerationListener,
    TopicSnapshotListener,
  ],
  controllers: [
    AcademicTermsController,
    AcademicYearsController,
    TermAssessmentPlanController,
    AssessmentController,
    MarkController,
    MarkCorrectionController,
    MaterialsCheckController,
    GradingBandController,
    ResultsController,
    GradeTrendController,
    TopicWeaknessController,
    StudentSummaryController,
    PerformanceTrendController,
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
