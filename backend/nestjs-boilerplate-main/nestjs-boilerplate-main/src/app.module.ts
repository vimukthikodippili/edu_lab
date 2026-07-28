import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import facebookConfig from './auth-facebook/config/facebook.config';
import googleConfig from './auth-google/config/google.config';
import appleConfig from './auth-apple/config/apple.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAppleModule } from './auth-apple/auth-apple.module';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { StudentsModule } from './students/students.module';
import { SubjectsModule } from './subjects/subjects.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { SchoolCalendarConfigModule } from './school-calendar-config/school-calendar-config.module';
import { TeacherSubjectRequirementsModule } from './teacher-subject-requirements/teacher-subject-requirements.module';
import { TimetableModule } from './timetable/timetable.module';
import { StaffModule } from './staff/staff.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationModule } from './notification/notification.module';
import { AttendanceModule } from './attendance/attendance.module';
import { GradesModule } from './grades/grades.module';
import { FeesModule } from './fees/fees.module';
import { LibraryModule } from './library/library.module';
import { CommunicationModule } from './communication/communication.module';
import { PrincipalModule } from './principal/principal.module';
import { MailerModule } from './mailer/mailer.module';
import { AuditModule } from './audit/audit.module';
import { LeaveModule } from './leave/leave.module';
import { ExpensesModule } from './expenses/expenses.module';
import { BiometricModule } from './biometric/biometric.module';
import { SyllabusModule } from './syllabus/syllabus.module';
import { LessonPlanModule } from './lesson-plan/lesson-plan.module';
import lessonPlanConfig from './lesson-plan/config/lesson-plan.config';
import { ClassDiaryModule } from './class-diary/class-diary.module';
import { ClassCheckInModule } from './class-check-in/class-check-in.module';
import { ClassRoomsModule } from './class-rooms/class-rooms.module';
import { StudentNotesModule } from './student-notes/student-notes.module';
import { CounselorModule } from './counselor/counselor.module';
import { MoodCheckInModule } from './mood-check-in/mood-check-in.module';
import { TeacherTasksModule } from './teacher-tasks/teacher-tasks.module';
import freePeriodConfig from './teacher-tasks/config/free-period.config';
import gradeTrendConfig from './grades/config/grade-trend.config';
import topicWeaknessConfig from './grades/config/topic-weakness.config';
import { TeacherPerformanceModule } from './teacher-performance/teacher-performance.module';
import { CareerModule } from './career/career.module';
import { LmsModule } from './lms/lms.module';
import { SchoolSettingsModule } from './school-settings/school-settings.module';
import { LiveClassMonitorModule } from './live-class-monitor/live-class-monitor.module';
import { LateAlertModule } from './late-alert/late-alert.module';
import { SubjectTopicsModule } from './subject-topics/subject-topics.module';
import { SportsModule } from './sports/sports.module';
import { LabsModule } from './labs/labs.module';
import { EquipmentModule } from './equipment/equipment.module';
import { SessionEquipmentModule } from './session-equipment/session-equipment.module';
import { ExperimentLogModule } from './experiment-log/experiment-log.module';
import { LabReportsModule } from './lab-reports/lab-reports.module';
import { LabOverviewModule } from './lab-overview/lab-overview.module';
import { DisorderRegistryModule } from './disorder-registry/disorder-registry.module';
import { ActionRuleModule } from './action-rule/action-rule.module';
import { AssessmentMatrixModule } from './assessment-matrix/assessment-matrix.module';
import { MhaConsentModule } from './mha-consent/mha-consent.module';
import { MhaSessionModule } from './mha-session/mha-session.module';
import { DomainResultModule } from './domain-result/domain-result.module';
import { SafetyNotificationModule } from './safety-notification/safety-notification.module';
import { MhaParentNotificationModule } from './mha-parent-notification/mha-parent-notification.module';
import { AcademicContextModule } from './academic-context/academic-context.module';
import { StudentTimelineModule } from './student-timeline/student-timeline.module';
import { EventModule } from './events/event.module';
import teacherPerformanceConfig from './teacher-performance/config/teacher-performance.config';
import wellbeingCaseConfig from './counselor/config/wellbeing-case.config';
import counselorNoteConfig from './counselor/config/counselor-note.config';
import domainResultNoteConfig from './domain-result/config/domain-result-note.config';
import liveSessionConfig from './lms/config/live-session.config';
import livekitConfig from './lms/config/livekit.config';
import livekitEgressConfig from './lms/config/livekit-egress.config';
import sportsAnalysisConfig from './sports/config/sports-analysis.config';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './database/mongoose-config.service';
import { DatabaseConfig } from './database/config/database-config.type';

// <database-block>
const infrastructureDatabaseModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    })
  : TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    });
// </database-block>

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
        appleConfig,
        lessonPlanConfig,
        freePeriodConfig,
        gradeTrendConfig,
        topicWeaknessConfig,
        teacherPerformanceConfig,
        wellbeingCaseConfig,
        counselorNoteConfig,
        domainResultNoteConfig,
        liveSessionConfig,
        livekitConfig,
        livekitEgressConfig,
        sportsAnalysisConfig,
      ],
      envFilePath: ['.env'],
    }),
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    UsersModule,
    FilesModule,
    AuthModule,
    AuthFacebookModule,
    AuthGoogleModule,
    AuthAppleModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
    StudentsModule,
    SubjectsModule,
    EnrollmentsModule,
    SchoolCalendarConfigModule,
    TeacherSubjectRequirementsModule,
    TimetableModule,
    StaffModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    NotificationModule,
    AttendanceModule,
    GradesModule,
    FeesModule,
    LibraryModule,
    CommunicationModule,
    PrincipalModule,
    AuditModule,
    LeaveModule,
    ExpensesModule,
    BiometricModule,
    SyllabusModule,
    LessonPlanModule,
    ClassDiaryModule,
    ClassCheckInModule,
    ClassRoomsModule,
    StudentNotesModule,
    CounselorModule,
    MoodCheckInModule,
    TeacherTasksModule,
    TeacherPerformanceModule,
    CareerModule,
    LmsModule,
    SchoolSettingsModule,
    LiveClassMonitorModule,
    LateAlertModule,
    SubjectTopicsModule,
    SportsModule,
    LabsModule,
    EquipmentModule,
    SessionEquipmentModule,
    ExperimentLogModule,
    LabReportsModule,
    LabOverviewModule,
    DisorderRegistryModule,
    ActionRuleModule,
    AssessmentMatrixModule,
    MhaConsentModule,
    MhaSessionModule,
    DomainResultModule,
    SafetyNotificationModule,
    MhaParentNotificationModule,
    StudentTimelineModule,
    EventModule,
    AcademicContextModule,
  ],
})
export class AppModule {}
