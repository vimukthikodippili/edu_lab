import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimetableEntryEntity, TimetableEntryStatus } from './entities/timetable-entry.entity';
import { TimetableRecordEntity } from './entities/timetable-record.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { GradeStageEntity } from '../students/entities/grade-stage.entity';
import { GradeStageService, resolveStageFromList } from '../students/grade-stage.service';
import { SchoolCalendarConfigService } from '../school-calendar-config/school-calendar-config.service';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';
import { FinalizeTimetableDto } from './dto/finalize-timetable.dto';
import { TimetableFinalizedEvent } from './events/timetable-finalized.event';

// ─── Result types ──────────────────────────────────────────────────────────────

export interface ConflictRecord {
  classSection: { id: number; gradeName: string; name: string };
  teacher: { id: string; name: string };
  subject: { id: string; code: string; name: string };
  requested: number;
  assigned: number;
  unassigned: number;
}

export interface GenerationResult {
  academicYear: string;
  entriesCreated: number;
  conflictsCount: number;
  durationMs: number;
  conflicts: ConflictRecord[];
}

export interface RoomConflictWarning {
  day: number;
  period: number;
  roomNumber: string;
  conflictingEntry: {
    classSection: { id: number; name: string };
    subject: { id: string; name: string };
    teacher: { id: string; name: string };
  };
}

// ─── Internal algorithm types ─────────────────────────────────────────────────

interface Slot {
  day: number;
  period: number;
}

interface RequirementRow {
  req: TeacherSubjectClassRequirementEntity;
  section: ClassSectionEntity;
  stage: GradeStageEntity | null;
}

export interface FinalizeResult {
  academicYear: string;
  finalizedAt: Date;
  teacherCount: number;
}

@Injectable()
export class TimetableService {
  constructor(
    @InjectRepository(TimetableEntryEntity)
    private readonly entryRepo: Repository<TimetableEntryEntity>,

    @InjectRepository(TimetableRecordEntity)
    private readonly recordRepo: Repository<TimetableRecordEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    private readonly calendarSvc: SchoolCalendarConfigService,
    private readonly gradeStageService: GradeStageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Public Methods ────────────────────────────────────────────────────────

  async generate(dto: GenerateTimetableDto): Promise<GenerationResult> {
    const start = Date.now();

    const existingRecord = await this.recordRepo.findOne({ where: { academicYear: dto.academicYear } });
    if (existingRecord?.isLocked) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          academicYear: `Timetable for ${dto.academicYear} is finalized. Unlock before regenerating.`,
        },
      });
    }

    // 1. Load class sections for the academic year (optionally filtered by grade)
    const sectionWhere: Record<string, unknown> = { academicYear: dto.academicYear };
    if (dto.gradeId) sectionWhere.gradeId = dto.gradeId;

    const sections = await this.classSectionRepo.find({
      where: sectionWhere,
      relations: ['grade'],
    });

    if (sections.length === 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          academicYear: `No class sections found for academic year ${dto.academicYear}${dto.gradeId ? ` and grade ${dto.gradeId}` : ''}.`,
        },
      });
    }

    const sectionIds = sections.map((s) => s.id);

    // 2. Load all requirements for those sections (with eager teacher + subject)
    const requirements = await this.requirementRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.teacher', 'teacher')
      .leftJoinAndSelect('r.subject', 'subject')
      .where('r.classSectionId IN (:...sectionIds)', { sectionIds })
      .getMany();

    if (requirements.length === 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          academicYear: `No period requirements configured for the selected class sections. Add requirements first.`,
        },
      });
    }

    // 3. Build section map for quick lookup
    const sectionMap = new Map<number, ClassSectionEntity>();
    for (const s of sections) sectionMap.set(s.id, s);

    // 4. Load all calendar configs + grade stages (batched once, not per-row)
    const configs = await this.calendarSvc.findAll();
    const configMap = new Map<string, { workingDaysPerWeek: number; periodsPerDay: number }>();
    for (const c of configs) {
      configMap.set(c.gradeStageId, {
        workingDaysPerWeek: c.workingDaysPerWeek,
        periodsPerDay: c.periodsPerDay,
      });
    }
    const gradeStages = await this.gradeStageService.findAll();

    // 5. Delete existing entries for this academic year + scope
    const deleteWhere: Record<string, unknown> = { academicYear: dto.academicYear };
    if (sectionIds.length > 0) {
      // Delete only for affected sections
      await this.entryRepo
        .createQueryBuilder()
        .delete()
        .where('academicYear = :year', { year: dto.academicYear })
        .andWhere('classSectionId IN (:...sectionIds)', { sectionIds })
        .execute();
    }

    // 6. Build requirement rows with section + stage attached
    const rows: RequirementRow[] = requirements.map((req) => {
      const section = sectionMap.get(req.classSectionId)!;
      return { req, section, stage: resolveStageFromList(gradeStages, section.grade.level) };
    });

    // 7. Run greedy algorithm
    const { entries, conflicts } = this.runGreedy(rows, configMap, dto.academicYear);

    // 8. Bulk insert generated entries
    if (entries.length > 0) {
      await this.entryRepo.save(entries);
    }

    return {
      academicYear: dto.academicYear,
      entriesCreated: entries.length,
      conflictsCount: conflicts.length,
      durationMs: Date.now() - start,
      conflicts,
    };
  }

  async findByClassSection(
    classSectionId: number,
    academicYear: string,
  ): Promise<TimetableEntryEntity[]> {
    const section = await this.classSectionRepo.findOne({ where: { id: classSectionId } });
    if (!section) {
      throw new NotFoundException(`Class section with id ${classSectionId} not found.`);
    }
    return this.entryRepo.find({
      where: { classSectionId, academicYear },
      order: { day: 'ASC', period: 'ASC' },
    });
  }

  async findByTeacher(teacherId: string, academicYear: string): Promise<TimetableEntryEntity[]> {
    return this.entryRepo.find({
      where: { teacherId, academicYear },
      order: { day: 'ASC', period: 'ASC' },
    });
  }

  async finalize(dto: FinalizeTimetableDto, finalizingStaffId?: string): Promise<FinalizeResult> {
    let record = await this.recordRepo.findOne({ where: { academicYear: dto.academicYear } });

    if (record?.isLocked) {
      throw new ConflictException(`Timetable for ${dto.academicYear} is already finalized.`);
    }

    const now = new Date();
    if (record) {
      record.isLocked = true;
      record.finalizedAt = now;
      record.finalizedBy = finalizingStaffId ?? null;
    } else {
      record = this.recordRepo.create({
        academicYear: dto.academicYear,
        isLocked: true,
        finalizedAt: now,
        finalizedBy: finalizingStaffId ?? null,
      });
    }
    await this.recordRepo.save(record);

    await this.entryRepo.update(
      { academicYear: dto.academicYear },
      { status: TimetableEntryStatus.PUBLISHED },
    );

    const teacherRows = await this.entryRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.teacherId', 'teacherId')
      .where('e.academicYear = :year', { year: dto.academicYear })
      .getRawMany<{ teacherId: string }>();

    const teacherIds = teacherRows.map((r) => r.teacherId);

    this.eventEmitter.emit(
      'timetable.finalized',
      new TimetableFinalizedEvent(dto.academicYear, now, teacherIds),
    );

    return { academicYear: dto.academicYear, finalizedAt: now, teacherCount: teacherIds.length };
  }

  async unlock(dto: FinalizeTimetableDto): Promise<TimetableRecordEntity> {
    const record = await this.recordRepo.findOne({ where: { academicYear: dto.academicYear } });
    if (!record) {
      throw new NotFoundException(`No timetable record found for academic year ${dto.academicYear}.`);
    }
    record.isLocked = false;
    record.finalizedAt = null;
    record.finalizedBy = null;
    return this.recordRepo.save(record);
  }

  async getRecord(academicYear: string): Promise<TimetableRecordEntity | { academicYear: string; isLocked: boolean; finalizedAt: null }> {
    const record = await this.recordRepo.findOne({ where: { academicYear } });
    return record ?? { academicYear, isLocked: false, finalizedAt: null };
  }

  async updateEntry(
    id: number,
    dto: UpdateTimetableEntryDto,
  ): Promise<TimetableEntryEntity & { roomConflict: RoomConflictWarning | null }> {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Timetable entry with id ${id} not found.`);
    }

    // isLocked only gates regeneration (see generate()) — manual edits remain allowed
    // even on a finalized/published timetable.
    const newDay = dto.day ?? entry.day;
    const newPeriod = dto.period ?? entry.period;

    if (newDay !== entry.day || newPeriod !== entry.period) {
      // Check teacher conflict
      const teacherConflict = await this.entryRepo.findOne({
        where: { teacherId: entry.teacherId, academicYear: entry.academicYear, day: newDay, period: newPeriod },
      });
      if (teacherConflict && teacherConflict.id !== id) {
        throw new ConflictException(
          `Teacher is already assigned to another class at day ${newDay}, period ${newPeriod}.`,
        );
      }

      // Check class section conflict
      const classConflict = await this.entryRepo.findOne({
        where: { classSectionId: entry.classSectionId, academicYear: entry.academicYear, day: newDay, period: newPeriod },
      });
      if (classConflict && classConflict.id !== id) {
        throw new ConflictException(
          `This class section already has a subject at day ${newDay}, period ${newPeriod}.`,
        );
      }
    }

    entry.day = newDay;
    entry.period = newPeriod;

    // Room conflicts are a soft constraint: logged, never blocking the save.
    let roomConflict: RoomConflictWarning | null = null;
    if (dto.roomNumber !== undefined) {
      entry.roomNumber = dto.roomNumber ?? null;

      if (entry.roomNumber) {
        const roomClash = await this.entryRepo.findOne({
          where: {
            academicYear: entry.academicYear,
            day: newDay,
            period: newPeriod,
            roomNumber: entry.roomNumber,
          },
        });
        if (roomClash && roomClash.id !== id) {
          roomConflict = {
            day: newDay,
            period: newPeriod,
            roomNumber: entry.roomNumber,
            conflictingEntry: {
              classSection: { id: roomClash.classSection.id, name: roomClash.classSection.name },
              subject: { id: roomClash.subject.id, name: roomClash.subject.name },
              teacher: { id: roomClash.teacher.id, name: `${roomClash.teacher.firstName} ${roomClash.teacher.lastName}` },
            },
          };
        }
      }
    }

    entry.status = TimetableEntryStatus.CONFIRMED;

    const saved = await this.entryRepo.save(entry);
    return Object.assign(saved, { roomConflict });
  }

  async deleteEntry(id: number): Promise<void> {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`Timetable entry with id ${id} not found.`);
    }
    // isLocked only gates regeneration (see generate()) — manual edits remain allowed
    // even on a finalized/published timetable.
    await this.entryRepo.remove(entry);
  }

  // ─── Greedy Algorithm ──────────────────────────────────────────────────────

  private runGreedy(
    rows: RequirementRow[],
    configMap: Map<string, { workingDaysPerWeek: number; periodsPerDay: number }>,
    academicYear: string,
  ): { entries: Partial<TimetableEntryEntity>[]; conflicts: ConflictRecord[] } {
    // Default grid if no config for a stage
    const DEFAULT_CFG = { workingDaysPerWeek: 5, periodsPerDay: 8 };

    // Occupancy tracking: key = "teacherId|day-period" or "classSectionId|day-period"
    const teacherBusy = new Map<string, Set<string>>();
    const classBusy = new Map<number, Set<string>>();

    const entries: Partial<TimetableEntryEntity>[] = [];
    const conflicts: ConflictRecord[] = [];

    // Sort: most periods/week first (hardest to place)
    const sorted = [...rows].sort((a, b) => b.req.periodsPerWeek - a.req.periodsPerWeek);

    for (const { req, section, stage } of sorted) {
      const cfg = (stage ? configMap.get(stage.id) : undefined) ?? DEFAULT_CFG;

      // All possible slots for this stage's grid
      const allSlots: Slot[] = [];
      for (let d = 1; d <= cfg.workingDaysPerWeek; d++) {
        for (let p = 1; p <= cfg.periodsPerDay; p++) {
          allSlots.push({ day: d, period: p });
        }
      }

      // Ensure occupancy sets exist
      if (!teacherBusy.has(req.teacherId)) teacherBusy.set(req.teacherId, new Set());
      if (!classBusy.has(req.classSectionId)) classBusy.set(req.classSectionId, new Set());

      const tBusy = teacherBusy.get(req.teacherId)!;
      const cBusy = classBusy.get(req.classSectionId)!;

      // Filter to available slots
      const available = allSlots.filter((s) => {
        const key = `${s.day}-${s.period}`;
        return !tBusy.has(key) && !cBusy.has(key);
      });

      // Sort available slots to spread across days:
      // Count how many periods are already assigned to this class on each day
      const dayLoad = new Map<number, number>();
      for (const key of cBusy) {
        const day = Number(key.split('-')[0]);
        dayLoad.set(day, (dayLoad.get(day) ?? 0) + 1);
      }

      available.sort((a, b) => {
        const loadA = dayLoad.get(a.day) ?? 0;
        const loadB = dayLoad.get(b.day) ?? 0;
        if (loadA !== loadB) return loadA - loadB; // prefer less-loaded days
        if (a.day !== b.day) return a.day - b.day;
        return a.period - b.period;
      });

      const selected = available.slice(0, req.periodsPerWeek);

      if (selected.length < req.periodsPerWeek) {
        conflicts.push({
          classSection: {
            id: section.id,
            gradeName: section.grade.name,
            name: section.name,
          },
          teacher: {
            id: req.teacherId,
            name: `${req.teacher.firstName} ${req.teacher.lastName}`,
          },
          subject: {
            id: req.subjectId,
            code: req.subject.code,
            name: req.subject.name,
          },
          requested: req.periodsPerWeek,
          assigned: selected.length,
          unassigned: req.periodsPerWeek - selected.length,
        });
      }

      for (const slot of selected) {
        const key = `${slot.day}-${slot.period}`;
        tBusy.add(key);
        cBusy.add(key);
        dayLoad.set(slot.day, (dayLoad.get(slot.day) ?? 0) + 1);

        entries.push({
          academicYear,
          classSectionId: req.classSectionId,
          day: slot.day,
          period: slot.period,
          teacherId: req.teacherId,
          subjectId: req.subjectId,
          roomNumber: null,
          status: TimetableEntryStatus.DRAFT,
        });
      }
    }

    return { entries, conflicts };
  }
}
