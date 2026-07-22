import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Between, In, Repository } from 'typeorm';
import { ExperimentLogEntity } from './entities/experiment-log.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { NotificationService } from '../notification/notification.service';
import { UpsertExperimentLogDto } from './dto/upsert-experiment-log.dto';
import { QueryExperimentLogDto } from './dto/query-experiment-log.dto';
import { buildBookingContext, ExperimentLogBookingContext } from './experiment-log-context';

export interface ExperimentLogWithContext {
  context: ExperimentLogBookingContext;
  log: ExperimentLogEntity | null;
}

export interface ExperimentLogHistoryRow extends ExperimentLogEntity {
  labId: string | null;
  labName: string;
}

@Injectable()
export class ExperimentLogService {
  private readonly logger = new Logger(ExperimentLogService.name);

  constructor(
    @InjectRepository(ExperimentLogEntity)
    private readonly logRepo: Repository<ExperimentLogEntity>,

    @InjectRepository(LabBookingEntity)
    private readonly bookingRepo: Repository<LabBookingEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    private readonly notificationService: NotificationService,
  ) {}

  async findForBooking(labBookingId: string, staffId: string, isPrivileged: boolean): Promise<ExperimentLogWithContext> {
    const booking = await this.findBooking(labBookingId);
    this.assertOwnership(booking, staffId, isPrivileged);
    const lab = await this.findLab(booking.labId);

    const log = (await this.logRepo.findOne({ where: { labBookingId } })) ?? null;
    if (log) await this.attachFiles([log]);

    return { context: buildBookingContext(booking, lab), log };
  }

  async upsertForBooking(
    labBookingId: string,
    dto: UpsertExperimentLogDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<ExperimentLogEntity> {
    const booking = await this.findBooking(labBookingId);
    this.assertOwnership(booking, staffId, isPrivileged);

    if (booking.status !== 'confirmed') {
      throw new ConflictException('Cannot log an experiment for a cancelled booking.');
    }

    if (dto.attachmentFileIds?.length) {
      const files = await this.fileRepo.findByIds(dto.attachmentFileIds);
      if (files.length !== dto.attachmentFileIds.length) {
        const foundIds = new Set(files.map((f) => f.id));
        const missing = dto.attachmentFileIds.filter((id) => !foundIds.has(id));
        throw new UnprocessableEntityException({
          status: 422,
          errors: { attachmentFileIds: `Attachment(s) not found: ${missing.join(', ')}` },
        });
      }
    }

    let entry = await this.logRepo.findOne({ where: { labBookingId } });
    if (entry) {
      entry.experimentName = dto.experimentName;
      entry.objective = dto.objective;
      entry.procedureSummary = dto.procedureSummary;
      entry.outcome = dto.outcome;
      entry.attachmentFileIds = dto.attachmentFileIds ?? entry.attachmentFileIds;
    } else {
      entry = this.logRepo.create({
        labBookingId,
        experimentName: dto.experimentName,
        objective: dto.objective,
        procedureSummary: dto.procedureSummary,
        outcome: dto.outcome,
        attachmentFileIds: dto.attachmentFileIds ?? [],
        loggedById: staffId,
      });
    }

    const saved = await this.logRepo.save(entry);
    await this.attachFiles([saved]);
    return saved;
  }

  /** School-wide diff, exported (not private) so TeacherTasksService can call it directly —
   * exact reuse seam as ClassDiaryService.getMissingEntriesForDate. */
  async getMissingLogsForDate(date: string): Promise<LabBookingEntity[]> {
    const bookings = await this.bookingRepo.find({ where: { date, status: 'confirmed' } });
    if (bookings.length === 0) return [];

    const bookingIds = bookings.map((b) => b.id);
    const logs = await this.logRepo.find({ where: { labBookingId: In(bookingIds) } });
    const loggedIds = new Set(logs.map((l) => l.labBookingId));

    return bookings.filter((b) => !loggedIds.has(b.id));
  }

  // Same fixed-time-after-school-hours convention as ClassDiaryService.sendMissingEntryReminders
  // — no period-end-time math, just a later daily check.
  @Cron('0 17 * * 1-6')
  async sendMissingLogReminders(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const missing = await this.getMissingLogsForDate(today);
    if (missing.length === 0) return;

    const countByTeacher = new Map<string, number>();
    missing.forEach((booking) => {
      countByTeacher.set(booking.teacherId, (countByTeacher.get(booking.teacherId) ?? 0) + 1);
    });

    this.logger.log(`Sending experiment log reminders to ${countByTeacher.size} teacher(s) for ${today}.`);

    await Promise.allSettled(
      [...countByTeacher.entries()].map(([teacherId, count]) =>
        this.notificationService.createForStaff(
          teacherId,
          'Lab Experiment Logs Missing',
          `You have ${count} lab session(s) today without an experiment log. Please log what was conducted.`,
          'experiment_log_reminder',
        ),
      ),
    );
  }

  /** Section Head / Principal full-history view (FR-P3-ER-05/06). `hasFullAccess` bypasses
   * ownership scoping entirely (admin, principal, section_head — FR-P3-ER-05 grants Section
   * Head the same oversight access as Principal here, a deliberately broader set than the
   * admin/principal-only "isPrivileged" used for write bypass elsewhere in this module family).
   * A non-full-access caller (teacher) is always additionally scoped to their own bookings,
   * regardless of what filters they pass. */
  async findFiltered(
    dto: QueryExperimentLogDto,
    staffId: string,
    hasFullAccess: boolean,
  ): Promise<ExperimentLogHistoryRow[]> {
    const bookingWhere: Record<string, unknown> = {};
    if (dto.labId) bookingWhere.labId = dto.labId;
    if (dto.subjectId) bookingWhere.subjectId = dto.subjectId;
    if (dto.classSectionId) bookingWhere.classSectionId = dto.classSectionId;
    if (dto.dateFrom && dto.dateTo) {
      bookingWhere.date = Between(dto.dateFrom, dto.dateTo);
    }
    if (!hasFullAccess) bookingWhere.teacherId = staffId;

    const bookings = await this.bookingRepo.find({ where: bookingWhere });
    if (bookings.length === 0) return [];

    const bookingIds = bookings.map((b) => b.id);
    const logs = await this.logRepo.find({
      where: { labBookingId: In(bookingIds) },
      order: { loggedAt: 'DESC' },
    });
    if (logs.length === 0) return [];
    await this.attachFiles(logs);

    const bookingMap = new Map(bookings.map((b) => [b.id, b]));
    const uniqueLabIds = [...new Set(bookings.map((b) => b.labId))];
    const labs = uniqueLabIds.length > 0 ? await this.labRepo.find({ where: { id: In(uniqueLabIds) } }) : [];
    const labMap = new Map(labs.map((l) => [l.id, l]));

    return logs.map((log) => {
      const booking = bookingMap.get(log.labBookingId);
      const lab = booking ? labMap.get(booking.labId) : undefined;
      return { ...log, labId: booking?.labId ?? null, labName: lab?.name ?? 'Unknown' };
    });
  }

  private async findBooking(labBookingId: string): Promise<LabBookingEntity> {
    const booking = await this.bookingRepo.findOne({ where: { id: labBookingId } });
    if (!booking) throw new NotFoundException(`Lab booking ${labBookingId} not found.`);
    return booking;
  }

  private async findLab(labId: string): Promise<LabEntity> {
    const lab = await this.labRepo.findOne({ where: { id: labId } });
    if (!lab) throw new NotFoundException(`Lab ${labId} not found.`);
    return lab;
  }

  /** "Own sessions" per FR-P3-AV-04 — the booking's own teacher, matching
   * SessionEquipmentService's identical ownership axis (not the lab's Lab In-Charge). */
  private assertOwnership(booking: LabBookingEntity, staffId: string, isPrivileged: boolean): void {
    if (!isPrivileged && booking.teacherId !== staffId) {
      throw new ForbiddenException('You are not the teacher for this lab session.');
    }
  }

  private async attachFiles(entries: ExperimentLogEntity[]): Promise<void> {
    const allIds = [...new Set(entries.flatMap((e) => e.attachmentFileIds ?? []))];
    if (allIds.length === 0) {
      entries.forEach((e) => (e.attachments = []));
      return;
    }
    const files = await this.fileRepo.findByIds(allIds);
    const fileById = new Map(files.map((f) => [f.id, { id: f.id, path: f.path }]));
    entries.forEach((e) => {
      e.attachments = (e.attachmentFileIds ?? [])
        .map((id) => fileById.get(id))
        .filter((f): f is { id: string; path: string } => !!f);
    });
  }
}
