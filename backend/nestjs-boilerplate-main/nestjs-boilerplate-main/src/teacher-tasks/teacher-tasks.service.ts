import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { MarkEntity, MarkStatus } from '../grades/entities/mark.entity';
import { AssessmentEntity } from '../grades/entities/assessment.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { LessonPlanService } from '../lesson-plan/lesson-plan.service';
import { ClassDiaryService } from '../class-diary/class-diary.service';
import { ExperimentLogService } from '../experiment-log/experiment-log.service';
import { AllConfigType } from '../config/config.type';

export interface UngradedMarkTask {
  assessmentId: string;
  assessmentTitle: string;
  subjectName: string;
  classSectionName: string;
  draftMarkCount: number;
}

export interface BehindScheduleLessonTask {
  syllabusUnitId: string;
  title: string;
  subjectName: string;
  gradeName: string;
  plannedCompletionDate: string;
}

export interface MissingDiaryTask {
  timetableEntryId: number;
  period: number;
  subjectName: string;
  classSectionName: string;
}

export interface MissingExperimentLogTask {
  labBookingId: string;
  periodNumber: number;
  subjectName: string | null;
  classSectionName: string | null;
}

export interface FreePeriodStatus {
  isFreePeriod: boolean;
  currentPeriod: number | null;
  tasks: {
    ungradedMarks: UngradedMarkTask[];
    behindScheduleLessons: BehindScheduleLessonTask[];
    missingDiaryEntries: MissingDiaryTask[];
    missingExperimentLogs: MissingExperimentLogTask[];
  } | null;
}

@Injectable()
export class TeacherTasksService {
  constructor(
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,

    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(TimetableEntryEntity)
    private readonly timetableRepo: Repository<TimetableEntryEntity>,

    private readonly lessonPlanService: LessonPlanService,
    private readonly classDiaryService: ClassDiaryService,
    private readonly experimentLogService: ExperimentLogService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  getCurrentPeriod(now: Date): number {
    const schoolStartTime = this.configService.get('freePeriod.schoolStartTime', {
      infer: true,
    }) as string;
    const periodDurationMinutes = this.configService.get(
      'freePeriod.periodDurationMinutes',
      { infer: true },
    ) as number;

    const [startHour, startMinute] = schoolStartTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const elapsed = nowMinutes - startMinutes;

    if (elapsed < 0) return 0;
    return Math.floor(elapsed / periodDurationMinutes) + 1;
  }

  async getFreePeriodStatus(staffId: string): Promise<FreePeriodStatus> {
    const now = new Date();
    const currentPeriod = this.getCurrentPeriod(now);
    const day = now.getDay();

    const currentClass =
      currentPeriod > 0
        ? await this.timetableRepo.findOne({
            where: { teacherId: staffId, day, period: currentPeriod },
          })
        : true;

    if (currentClass) {
      return {
        isFreePeriod: false,
        currentPeriod: currentPeriod || null,
        tasks: null,
      };
    }

    const [ungradedMarks, behindScheduleLessons, missingDiaryEntries, missingExperimentLogs] =
      await Promise.all([
        this.getUngradedMarks(staffId),
        this.getBehindScheduleLessons(staffId),
        this.getMissingDiaryEntries(staffId),
        this.getMissingExperimentLogs(staffId),
      ]);

    return {
      isFreePeriod: true,
      currentPeriod,
      tasks: { ungradedMarks, behindScheduleLessons, missingDiaryEntries, missingExperimentLogs },
    };
  }

  private async getUngradedMarks(staffId: string): Promise<UngradedMarkTask[]> {
    const requirements = await this.requirementRepo.find({
      where: { teacherId: staffId },
    });

    const subjectClassPairs = requirements.map((r) => ({
      subjectId: r.subjectId,
      classSectionId: r.classSectionId,
    }));

    const assessments = await this.assessmentRepo.find({
      where: subjectClassPairs.length
        ? [{ createdByTeacherId: staffId }, ...subjectClassPairs]
        : { createdByTeacherId: staffId },
    });
    if (!assessments.length) return [];

    const assessmentIds = assessments.map((a) => a.id);
    const draftMarks = await this.markRepo.find({
      where: { assessmentId: In(assessmentIds), status: MarkStatus.DRAFT },
    });

    const draftCountByAssessment = new Map<string, number>();
    for (const mark of draftMarks) {
      draftCountByAssessment.set(
        mark.assessmentId,
        (draftCountByAssessment.get(mark.assessmentId) ?? 0) + 1,
      );
    }

    return assessments
      .filter((a) => draftCountByAssessment.has(a.id))
      .map((a) => ({
        assessmentId: a.id,
        assessmentTitle: a.title,
        subjectName: a.subject.name,
        classSectionName: a.classSection.name,
        draftMarkCount: draftCountByAssessment.get(a.id) ?? 0,
      }));
  }

  private async getBehindScheduleLessons(
    staffId: string,
  ): Promise<BehindScheduleLessonTask[]> {
    const entries = await this.lessonPlanService.findEntries(staffId, {
      academicYear: String(new Date().getFullYear()),
    });

    return entries
      .filter((e) => e.behindSchedule)
      .map((e) => ({
        syllabusUnitId: e.syllabusUnitId,
        title: e.syllabusUnit.title,
        subjectName: e.syllabusUnit.subject.name,
        gradeName: e.syllabusUnit.grade.name,
        plannedCompletionDate: e.plannedCompletionDate,
      }));
  }

  private async getMissingDiaryEntries(
    staffId: string,
  ): Promise<MissingDiaryTask[]> {
    const today = new Date().toISOString().split('T')[0];
    const missing = await this.classDiaryService.getMissingEntriesForDate(today);

    return missing
      .filter((entry) => entry.teacherId === staffId)
      .map((entry) => ({
        timetableEntryId: entry.id,
        period: entry.period,
        subjectName: entry.subject.name,
        classSectionName: entry.classSection.name,
      }));
  }

  private async getMissingExperimentLogs(
    staffId: string,
  ): Promise<MissingExperimentLogTask[]> {
    const today = new Date().toISOString().split('T')[0];
    const missing = await this.experimentLogService.getMissingLogsForDate(today);

    return missing
      .filter((booking) => booking.teacherId === staffId)
      .map((booking) => ({
        labBookingId: booking.id,
        periodNumber: booking.periodNumber,
        subjectName: booking.subject?.name ?? null,
        classSectionName: booking.classSection?.name ?? null,
      }));
  }
}
