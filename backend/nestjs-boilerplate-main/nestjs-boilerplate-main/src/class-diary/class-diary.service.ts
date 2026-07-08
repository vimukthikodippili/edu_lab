import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { ClassDiaryEntryEntity } from './entities/class-diary-entry.entity';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { SchoolHolidayEntity } from '../attendance/entities/school-holiday.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { NotificationService } from '../notification/notification.service';
import { UpsertClassDiaryEntryDto } from './dto/upsert-class-diary-entry.dto';

export interface ClassDiarySlot {
  timetableEntry: TimetableEntryEntity;
  diaryEntry: ClassDiaryEntryEntity | null;
}

@Injectable()
export class ClassDiaryService {
  private readonly logger = new Logger(ClassDiaryService.name);

  constructor(
    @InjectRepository(ClassDiaryEntryEntity)
    private readonly diaryRepo: Repository<ClassDiaryEntryEntity>,

    @InjectRepository(TimetableEntryEntity)
    private readonly timetableRepo: Repository<TimetableEntryEntity>,

    @InjectRepository(SchoolHolidayEntity)
    private readonly holidayRepo: Repository<SchoolHolidayEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    private readonly notificationService: NotificationService,
  ) {}

  /** JS getUTCDay(): 0=Sun..6=Sat. TimetableEntryEntity.day: 1=Mon..6=Sat. Sunday has no mapping (no school). */
  private mapToTimetableDay(date: string): number {
    return new Date(`${date}T00:00:00Z`).getUTCDay();
  }

  private async isSchoolDay(date: string): Promise<boolean> {
    const jsDay = this.mapToTimetableDay(date);
    if (jsDay === 0) return false; // Sunday

    const dateObj = new Date(`${date}T00:00:00Z`);
    const holiday = await this.holidayRepo.findOne({
      where: { date: dateObj as unknown as Date },
    });
    return !holiday;
  }

  private async attachFiles(entries: ClassDiaryEntryEntity[]): Promise<void> {
    const allIds = [...new Set(entries.flatMap((e) => e.attachmentFileIds ?? []))];
    if (!allIds.length) {
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

  async getDailyView(staffId: string, date: string): Promise<ClassDiarySlot[]> {
    if (!(await this.isSchoolDay(date))) return [];

    const jsDay = this.mapToTimetableDay(date);
    const academicYear = date.slice(0, 4);

    const timetableEntries = await this.timetableRepo.find({
      where: { teacherId: staffId, day: jsDay, academicYear },
      order: { period: 'ASC' },
    });
    if (!timetableEntries.length) return [];

    const entryIds = timetableEntries.map((e) => e.id);
    const diaryEntries = await this.diaryRepo.find({
      where: { date, timetableEntryId: In(entryIds) },
    });
    await this.attachFiles(diaryEntries);

    const diaryByTimetableId = new Map(diaryEntries.map((d) => [d.timetableEntryId, d]));

    return timetableEntries.map((timetableEntry) => ({
      timetableEntry,
      diaryEntry: diaryByTimetableId.get(timetableEntry.id) ?? null,
    }));
  }

  async upsertEntry(
    staffId: string,
    dto: UpsertClassDiaryEntryDto,
  ): Promise<ClassDiaryEntryEntity> {
    const timetableEntry = await this.timetableRepo.findOne({
      where: { id: dto.timetableEntryId },
    });
    if (!timetableEntry) {
      throw new NotFoundException('Timetable period not found.');
    }
    if (timetableEntry.teacherId !== staffId) {
      throw new ForbiddenException('You can only log diary entries for your own periods.');
    }
    if (this.mapToTimetableDay(dto.date) !== timetableEntry.day) {
      throw new UnprocessableEntityException(
        `The selected date does not fall on this period's scheduled day of the week.`,
      );
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

    let entry = await this.diaryRepo.findOne({
      where: { timetableEntryId: dto.timetableEntryId, date: dto.date },
    });

    if (entry) {
      entry.notes = dto.notes ?? entry.notes;
      entry.attachmentFileIds = dto.attachmentFileIds ?? entry.attachmentFileIds;
    } else {
      entry = this.diaryRepo.create({
        timetableEntryId: dto.timetableEntryId,
        date: dto.date,
        notes: dto.notes ?? null,
        attachmentFileIds: dto.attachmentFileIds ?? [],
      });
    }

    const saved = await this.diaryRepo.save(entry);
    await this.attachFiles([saved]);
    return saved;
  }

  async getMissingEntriesForDate(date: string): Promise<TimetableEntryEntity[]> {
    if (!(await this.isSchoolDay(date))) return [];

    const jsDay = this.mapToTimetableDay(date);
    const academicYear = date.slice(0, 4);

    const timetableEntries = await this.timetableRepo.find({
      where: { day: jsDay, academicYear },
    });
    if (!timetableEntries.length) return [];

    const entryIds = timetableEntries.map((e) => e.id);
    const diaryEntries = await this.diaryRepo.find({
      where: { date, timetableEntryId: In(entryIds) },
    });
    const loggedIds = new Set(diaryEntries.map((d) => d.timetableEntryId));

    return timetableEntries.filter((e) => !loggedIds.has(e.id));
  }

  @Cron('0 17 * * 1-6')
  async sendMissingEntryReminders(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const missing = await this.getMissingEntriesForDate(today);
    if (!missing.length) return;

    const countByTeacher = new Map<string, number>();
    missing.forEach((entry) => {
      countByTeacher.set(entry.teacherId, (countByTeacher.get(entry.teacherId) ?? 0) + 1);
    });

    this.logger.log(
      `Sending class diary reminders to ${countByTeacher.size} teacher(s) for ${today}.`,
    );

    await Promise.allSettled(
      [...countByTeacher.entries()].map(([teacherId, count]) =>
        this.notificationService.createForStaff(
          teacherId,
          'Class Diary Entries Missing',
          `You have ${count} period(s) today without a class diary entry. Please log what was taught.`,
          'class_diary_reminder',
        ),
      ),
    );
  }
}
