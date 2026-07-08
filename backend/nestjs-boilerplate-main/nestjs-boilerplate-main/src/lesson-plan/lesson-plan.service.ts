import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { In, Not, Repository } from 'typeorm';
import { AnnualLessonPlanEntryEntity } from './entities/annual-lesson-plan-entry.entity';
import { AnnualLessonPlanSubmissionEntity } from './entities/annual-lesson-plan-submission.entity';
import { MonthEndIncompleteItem, MonthEndSummaryEntity } from './entities/month-end-summary.entity';
import { TimetableRecordEntity } from '../timetable/entities/timetable-record.entity';
import { SyllabusUnitEntity } from '../syllabus/entities/syllabus-unit.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { NotificationService } from '../notification/notification.service';
import { AllConfigType } from '../config/config.type';
import { UpsertLessonPlanEntryDto } from './dto/upsert-lesson-plan-entry.dto';
import { SubmitLessonPlanDto } from './dto/submit-lesson-plan.dto';
import { QueryLessonPlanDto } from './dto/query-lesson-plan.dto';
import { MarkCompleteLessonPlanEntryDto } from './dto/mark-complete-lesson-plan-entry.dto';
import { SectionSummaryQueryDto } from './dto/section-summary-query.dto';
import { QueryMonthlyPlanDto } from './dto/query-monthly-plan.dto';
import { MonthEndSummaryQueryDto } from './dto/month-end-summary-query.dto';

export type LessonPlanEntryWithFlag = AnnualLessonPlanEntryEntity & {
  behindSchedule: boolean;
};

export type MonthlyPlanEntry = LessonPlanEntryWithFlag & {
  carriedForward: boolean;
};

export interface MonthlyPlanResult {
  entries: MonthlyPlanEntry[];
  monthCompletionPercent: number;
}

export interface SectionSyllabusSubjectSummary {
  subjectId: string;
  subjectName: string;
  gradeId: number;
  gradeName: string;
  totalUnits: number;
  completedUnits: number;
  completionPercentage: number;
  behindSchedule: boolean;
}

export interface SectionSyllabusTeacherSummary {
  staffId: string;
  teacherName: string;
  subjects: SectionSyllabusSubjectSummary[];
}

export interface MonthEndSubjectSummary {
  subjectId: string;
  subjectName: string;
  gradeId: number;
  plannedCount: number;
  completedCount: number;
  completionPercentage: number;
  incompleteItems: MonthEndIncompleteItem[];
}

export interface MonthEndTeacherSummary {
  staffId: string;
  teacherName: string;
  subjects: MonthEndSubjectSummary[];
}

@Injectable()
export class LessonPlanService {
  private readonly logger = new Logger(LessonPlanService.name);

  constructor(
    @InjectRepository(AnnualLessonPlanEntryEntity)
    private readonly entryRepo: Repository<AnnualLessonPlanEntryEntity>,

    @InjectRepository(AnnualLessonPlanSubmissionEntity)
    private readonly submissionRepo: Repository<AnnualLessonPlanSubmissionEntity>,

    @InjectRepository(TimetableRecordEntity)
    private readonly timetableRepo: Repository<TimetableRecordEntity>,

    @InjectRepository(SyllabusUnitEntity)
    private readonly syllabusUnitRepo: Repository<SyllabusUnitEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    @InjectRepository(MonthEndSummaryEntity)
    private readonly monthEndSummaryRepo: Repository<MonthEndSummaryEntity>,

    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async findEntries(
    staffId: string,
    query: QueryLessonPlanDto,
  ): Promise<LessonPlanEntryWithFlag[]> {
    const where: Record<string, unknown> = { staffId };
    if (query.academicYear) where.academicYear = query.academicYear;

    const entries = await this.entryRepo.find({ where });

    return entries
      .filter((entry) => {
        if (query.subjectId && entry.syllabusUnit?.subjectId !== query.subjectId)
          return false;
        if (query.gradeId && entry.syllabusUnit?.gradeId !== query.gradeId)
          return false;
        return true;
      })
      .map((entry) => ({
        ...entry,
        behindSchedule: this.computeBehindSchedule(
          entry.plannedCompletionDate,
          entry.isComplete,
        ),
      }));
  }

  computeBehindSchedule(
    plannedCompletionDate: string,
    isComplete: boolean,
  ): boolean {
    if (isComplete) return false;
    const today = new Date().toISOString().split('T')[0];
    return today > plannedCompletionDate;
  }

  async markComplete(
    staffId: string,
    dto: MarkCompleteLessonPlanEntryDto,
  ): Promise<LessonPlanEntryWithFlag> {
    const entry = await this.entryRepo.findOne({
      where: { staffId, syllabusUnitId: dto.syllabusUnitId },
    });

    if (!entry) {
      throw new NotFoundException(
        'No lesson plan entry found for this unit. Set a planned date first.',
      );
    }

    entry.isComplete = true;
    entry.actualCompletionDate =
      dto.actualCompletionDate ?? new Date().toISOString().split('T')[0];

    const saved = await this.entryRepo.save(entry);
    return { ...saved, behindSchedule: false };
  }

  async getSectionSummary(
    query: SectionSummaryQueryDto,
  ): Promise<SectionSyllabusTeacherSummary[]> {
    const { academicYear, gradeFrom, gradeTo } = query;

    const inGradeRange = (gradeId: number): boolean => {
      if (gradeFrom !== undefined && gradeId < gradeFrom) return false;
      if (gradeTo !== undefined && gradeId > gradeTo) return false;
      return true;
    };

    const entries = await this.entryRepo.find({ where: { academicYear } });
    const scopedEntries = entries.filter((entry) =>
      inGradeRange(entry.syllabusUnit.gradeId),
    );

    const units = await this.syllabusUnitRepo.find({ where: { academicYear } });
    const scopedUnits = units.filter((unit) => inGradeRange(unit.gradeId));

    const totalUnitsByKey = new Map<string, number>();
    for (const unit of scopedUnits) {
      const key = `${unit.subjectId}::${unit.gradeId}`;
      totalUnitsByKey.set(key, (totalUnitsByKey.get(key) ?? 0) + 1);
    }

    const groups = new Map<string, AnnualLessonPlanEntryEntity[]>();
    for (const entry of scopedEntries) {
      const key = `${entry.staffId}::${entry.syllabusUnit.subjectId}::${entry.syllabusUnit.gradeId}`;
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }

    const staffIds = [...new Set(scopedEntries.map((e) => e.staffId))];
    const staffMembers = staffIds.length
      ? await this.staffRepo.find({ where: { id: In(staffIds) } })
      : [];
    const staffNameById = new Map(
      staffMembers.map((s) => [s.id, `${s.firstName} ${s.lastName}`]),
    );

    const teacherMap = new Map<string, SectionSyllabusTeacherSummary>();

    for (const [key, groupEntries] of groups) {
      const [staffId] = key.split('::');
      const first = groupEntries[0];
      const subjectId = first.syllabusUnit.subjectId;
      const gradeId = first.syllabusUnit.gradeId;

      const totalUnits = totalUnitsByKey.get(`${subjectId}::${gradeId}`) ?? 0;
      const completedUnits = groupEntries.filter((e) => e.isComplete).length;
      const behindSchedule = groupEntries.some((e) =>
        this.computeBehindSchedule(e.plannedCompletionDate, e.isComplete),
      );

      const subjectSummary: SectionSyllabusSubjectSummary = {
        subjectId,
        subjectName: first.syllabusUnit.subject.name,
        gradeId,
        gradeName: first.syllabusUnit.grade.name,
        totalUnits,
        completedUnits,
        completionPercentage:
          totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0,
        behindSchedule,
      };

      const teacher = teacherMap.get(staffId) ?? {
        staffId,
        teacherName: staffNameById.get(staffId) ?? 'Unknown Teacher',
        subjects: [],
      };
      teacher.subjects.push(subjectSummary);
      teacherMap.set(staffId, teacher);
    }

    const teachers = [...teacherMap.values()];
    teachers.forEach((t) =>
      t.subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    );
    teachers.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

    return teachers;
  }

  /**
   * Tags entries as in-month or carried-forward for a given (academicYear, month) window.
   * Shared by getMonthlyPlan (on-demand, per-teacher) and generateMonthEndSummaries
   * (scheduled, school-wide) so the two never disagree on what "due this month" means.
   */
  private filterEntriesForMonth(
    entries: AnnualLessonPlanEntryEntity[],
    academicYear: string,
    month: number,
  ): MonthlyPlanEntry[] {
    const monthStart = `${academicYear}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${academicYear}-${String(month).padStart(2, '0')}-31`;

    return entries
      .filter((entry) => {
        const inMonth =
          entry.plannedCompletionDate >= monthStart &&
          entry.plannedCompletionDate <= monthEnd;
        const carriedForward = !entry.isComplete && entry.plannedCompletionDate < monthStart;
        return inMonth || carriedForward;
      })
      .map((entry) => ({
        ...entry,
        behindSchedule: this.computeBehindSchedule(
          entry.plannedCompletionDate,
          entry.isComplete,
        ),
        carriedForward: !entry.isComplete && entry.plannedCompletionDate < monthStart,
      }));
  }

  async getMonthlyPlan(
    staffId: string,
    query: QueryMonthlyPlanDto,
  ): Promise<MonthlyPlanResult> {
    const { academicYear, month, subjectId, gradeId } = query;

    const entries = await this.entryRepo.find({ where: { staffId, academicYear } });
    const scoped = entries.filter((entry) => {
      if (subjectId && entry.syllabusUnit?.subjectId !== subjectId) return false;
      if (gradeId && entry.syllabusUnit?.gradeId !== gradeId) return false;
      return true;
    });

    const result = this.filterEntriesForMonth(scoped, academicYear, month);

    const dueThisMonth = result.filter((e) => !e.carriedForward);
    const completedThisMonth = dueThisMonth.filter((e) => e.isComplete).length;
    const monthCompletionPercent =
      dueThisMonth.length === 0 ? 0 : (completedThisMonth / dueThisMonth.length) * 100;

    return { entries: result, monthCompletionPercent };
  }

  private static readonly MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  @Cron('0 6 1 * *')
  async runMonthEndSummary(): Promise<void> {
    const now = new Date();
    // Runs on the 1st — summarize the month that just ended, handling the Dec -> Jan rollover.
    const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const targetYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    await this.generateMonthEndSummaries(String(targetYear), targetMonth);
  }

  async generateMonthEndSummaries(academicYear: string, month: number): Promise<void> {
    const entries = await this.entryRepo.find({ where: { academicYear } });
    const filtered = this.filterEntriesForMonth(entries, academicYear, month);

    const groups = new Map<string, MonthlyPlanEntry[]>();
    for (const entry of filtered) {
      const key = `${entry.staffId}::${entry.syllabusUnit.subjectId}`;
      const group = groups.get(key) ?? [];
      group.push(entry);
      groups.set(key, group);
    }

    for (const [key, groupEntries] of groups) {
      const [staffId, subjectId] = key.split('::');
      const gradeId = groupEntries[0].syllabusUnit.gradeId;

      const dueThisMonth = groupEntries.filter((e) => !e.carriedForward);
      const plannedCount = dueThisMonth.length;
      const completedCount = dueThisMonth.filter((e) => e.isComplete).length;
      const incompleteItems = groupEntries
        .filter((e) => !e.isComplete)
        .map((e) => ({
          title: e.syllabusUnit.title,
          plannedCompletionDate: e.plannedCompletionDate,
        }));

      let summary = await this.monthEndSummaryRepo.findOne({
        where: { staffId, subjectId, academicYear, month },
      });
      summary =
        summary ??
        this.monthEndSummaryRepo.create({ staffId, subjectId, academicYear, month });
      summary.gradeId = gradeId;
      summary.plannedCount = plannedCount;
      summary.completedCount = completedCount;
      summary.incompleteItems = incompleteItems;

      await this.monthEndSummaryRepo.save(summary);
    }

    const monthName = LessonPlanService.MONTH_NAMES[month - 1];
    const oversightUsers = await this.userRepo.find({
      where: [
        { role: { id: RoleEnum.principal } },
        { role: { id: RoleEnum.section_head } },
      ],
      relations: ['role'],
    });

    for (const user of oversightUsers) {
      if (!user.email) continue;
      const staff = await this.staffRepo.findOne({ where: { email: user.email } });
      if (!staff) continue;
      await this.notificationService
        .createForStaff(
          staff.id,
          'Month-End Syllabus Summary Ready',
          `The ${monthName} ${academicYear} lesson coverage summary is ready to view.`,
          'month_end_summary',
        )
        .catch(() => undefined);
    }

    this.logger.log(
      `Generated ${groups.size} month-end summary row(s) for ${monthName} ${academicYear}, notified ${oversightUsers.length} oversight staff.`,
    );
  }

  async getMonthEndSummaries(
    query: MonthEndSummaryQueryDto,
  ): Promise<MonthEndTeacherSummary[]> {
    const { academicYear, month, gradeFrom, gradeTo } = query;

    const inGradeRange = (gradeId: number): boolean => {
      if (gradeFrom !== undefined && gradeId < gradeFrom) return false;
      if (gradeTo !== undefined && gradeId > gradeTo) return false;
      return true;
    };

    const rows = await this.monthEndSummaryRepo.find({ where: { academicYear, month } });
    const scopedRows = rows.filter((row) => inGradeRange(row.gradeId));

    const subjectIds = [...new Set(scopedRows.map((r) => r.subjectId))];
    const subjects = subjectIds.length
      ? await this.subjectRepo.find({ where: { id: In(subjectIds) } })
      : [];
    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

    const staffIds = [...new Set(scopedRows.map((r) => r.staffId))];
    const staffMembers = staffIds.length
      ? await this.staffRepo.find({ where: { id: In(staffIds) } })
      : [];
    const staffNameById = new Map(
      staffMembers.map((s) => [s.id, `${s.firstName} ${s.lastName}`]),
    );

    const teacherMap = new Map<string, MonthEndTeacherSummary>();
    for (const row of scopedRows) {
      const subjectSummary: MonthEndSubjectSummary = {
        subjectId: row.subjectId,
        subjectName: subjectNameById.get(row.subjectId) ?? 'Unknown Subject',
        gradeId: row.gradeId,
        plannedCount: row.plannedCount,
        completedCount: row.completedCount,
        completionPercentage:
          row.plannedCount > 0
            ? Math.round((row.completedCount / row.plannedCount) * 100)
            : 0,
        incompleteItems: row.incompleteItems,
      };

      const teacher = teacherMap.get(row.staffId) ?? {
        staffId: row.staffId,
        teacherName: staffNameById.get(row.staffId) ?? 'Unknown Teacher',
        subjects: [],
      };
      teacher.subjects.push(subjectSummary);
      teacherMap.set(row.staffId, teacher);
    }

    const teachers = [...teacherMap.values()];
    teachers.forEach((t) =>
      t.subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    );
    teachers.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

    return teachers;
  }

  async upsertEntry(
    staffId: string,
    dto: UpsertLessonPlanEntryDto,
  ): Promise<AnnualLessonPlanEntryEntity> {
    let entry = await this.entryRepo.findOne({
      where: { staffId, syllabusUnitId: dto.syllabusUnitId },
    });

    if (entry) {
      entry.plannedCompletionDate = dto.plannedCompletionDate;
      entry.academicYear = dto.academicYear;
    } else {
      entry = this.entryRepo.create({
        staffId,
        syllabusUnitId: dto.syllabusUnitId,
        plannedCompletionDate: dto.plannedCompletionDate,
        academicYear: dto.academicYear,
      });
    }

    return this.entryRepo.save(entry);
  }

  async getStatus(
    staffId: string,
    subjectId: string,
    gradeId: number,
    academicYear: string,
  ): Promise<{
    isSubmitted: boolean;
    submittedAt: Date | null;
    totalUnits: number;
    completedEntries: number;
    daysUntilDeadline: number | null;
    deadlineDate: string | null;
  }> {
    const submission = await this.submissionRepo.findOne({
      where: { staffId, subjectId, gradeId, academicYear },
    });

    const totalUnits = await this.syllabusUnitRepo.count({
      where: { subjectId, gradeId, academicYear },
    });

    const units = await this.syllabusUnitRepo.find({
      where: { subjectId, gradeId, academicYear },
      select: ['id'],
    });
    const unitIds = units.map((u) => u.id);

    const completedEntries =
      unitIds.length > 0
        ? await this.entryRepo.count({
            where: { staffId, syllabusUnitId: In(unitIds) },
          })
        : 0;

    const deadlineMonth = this.configService.get('lessonPlan.planningDeadlineMonth', {
      infer: true,
    }) as number | undefined;
    const deadlineDay = this.configService.get('lessonPlan.planningDeadlineDay', {
      infer: true,
    }) as number | undefined;

    let daysUntilDeadline: number | null = null;
    let deadlineDate: string | null = null;

    if (deadlineMonth && deadlineDay) {
      const now = new Date();
      const currentYear = parseInt(academicYear, 10);
      const deadline = new Date(currentYear, deadlineMonth - 1, deadlineDay);
      deadlineDate = deadline.toISOString().split('T')[0];
      const diffMs = deadline.getTime() - now.getTime();
      daysUntilDeadline = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      isSubmitted: submission?.isSubmitted ?? false,
      submittedAt: submission?.submittedAt ?? null,
      totalUnits,
      completedEntries,
      daysUntilDeadline,
      deadlineDate,
    };
  }

  async submit(
    staffId: string,
    dto: SubmitLessonPlanDto,
  ): Promise<AnnualLessonPlanSubmissionEntity> {
    const { subjectId, gradeId, academicYear } = dto;

    // Gate 1: timetable must be finalized
    const timetableRecord = await this.timetableRepo.findOne({
      where: { academicYear },
    });

    if (!timetableRecord?.finalizedAt) {
      throw new UnprocessableEntityException(
        `The timetable for ${academicYear} has not been finalized yet. ` +
          `Please wait until the timetable is confirmed before submitting your annual lesson plan.`,
      );
    }

    // Gate 2: all syllabus units must have a planned date
    const units = await this.syllabusUnitRepo.find({
      where: { subjectId, gradeId, academicYear },
      select: ['id'],
    });
    const totalUnits = units.length;
    const unitIds = units.map((u) => u.id);

    const completedEntries =
      unitIds.length > 0
        ? await this.entryRepo.count({
            where: { staffId, syllabusUnitId: In(unitIds) },
          })
        : 0;

    if (completedEntries < totalUnits) {
      const missing = totalUnits - completedEntries;
      throw new UnprocessableEntityException(
        `${missing} lesson(s) are missing a planned completion date. ` +
          `All ${totalUnits} lessons must have a date before the plan can be submitted.`,
      );
    }

    let submission = await this.submissionRepo.findOne({
      where: { staffId, subjectId, gradeId, academicYear },
    });

    if (submission) {
      submission.isSubmitted = true;
      submission.submittedAt = new Date();
    } else {
      submission = this.submissionRepo.create({
        staffId,
        subjectId,
        gradeId,
        academicYear,
        isSubmitted: true,
        submittedAt: new Date(),
      });
    }

    return this.submissionRepo.save(submission);
  }

  @Cron('0 8 * * *')
  async sendReminderNotifications(): Promise<void> {
    const reminderDays = this.configService.get(
      'lessonPlan.reminderDaysBeforeDeadline',
      { infer: true },
    ) as number;
    const deadlineMonth = this.configService.get(
      'lessonPlan.planningDeadlineMonth',
      { infer: true },
    ) as number;
    const deadlineDay = this.configService.get(
      'lessonPlan.planningDeadlineDay',
      { infer: true },
    ) as number;

    const now = new Date();
    const currentYear = now.getFullYear();
    const deadline = new Date(currentYear, deadlineMonth - 1, deadlineDay);
    const reminderDate = new Date(deadline);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);

    const todayStr = now.toISOString().split('T')[0];
    const reminderStr = reminderDate.toISOString().split('T')[0];

    if (todayStr !== reminderStr) return;

    this.logger.log(
      `Sending annual lesson plan reminders (deadline: ${deadline.toDateString()})`,
    );

    const activeStaff = await this.staffRepo.find({
      where: { status: StaffStatus.ACTIVE },
      select: ['id'],
    });

    const academicYear = String(currentYear);

    const submittedStaffIds = await this.submissionRepo
      .find({
        where: { academicYear, isSubmitted: true },
        select: ['staffId'],
      })
      .then((rows) => rows.map((r) => r.staffId));

    const unsubmittedStaff = activeStaff.filter(
      (s) => !submittedStaffIds.includes(s.id),
    );

    const deadlineFormatted = deadline.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    await Promise.allSettled(
      unsubmittedStaff.map((staff) =>
        this.notificationService.createForStaff(
          staff.id,
          'Annual Lesson Plan Reminder',
          `Your annual lesson plan is due on ${deadlineFormatted}. ` +
            `Please complete and submit your plan before the deadline.`,
          'annual_lesson_plan_reminder',
        ),
      ),
    );

    this.logger.log(
      `Sent lesson plan reminders to ${unsubmittedStaff.length} staff member(s).`,
    );
  }
}
