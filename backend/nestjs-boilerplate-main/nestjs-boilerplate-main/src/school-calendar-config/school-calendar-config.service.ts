import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { Repository } from 'typeorm';
import { GradeStageService } from '../students/grade-stage.service';
import { SchoolCalendarConfigEntity } from './entities/school-calendar-config.entity';
import { UpsertCalendarConfigDto } from './dto/upsert-calendar-config.dto';

// A newly-added grade stage has no config row of its own yet — rather than 404ing until an
// admin explicitly visits this screen, a fresh row is lazily created with these defaults the
// first time it's read, the same "lazy singleton" convention SchoolSettingsEntity already uses.
const DEFAULT_WORKING_DAYS_PER_WEEK = 5;
const DEFAULT_PERIODS_PER_DAY = 8;

export interface CalendarConfigResponse {
  id: number;
  gradeStageId: string;
  gradeStage: { id: string; stageName: string; fromGrade: number; toGrade: number; ordering: number };
  workingDaysPerWeek: number;
  periodsPerDay: number;
  totalWeeklySlots: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SchoolCalendarConfigService {
  constructor(
    @InjectRepository(SchoolCalendarConfigEntity)
    private readonly repo: Repository<SchoolCalendarConfigEntity>,

    private readonly gradeStageService: GradeStageService,
  ) {}

  async findAll(): Promise<CalendarConfigResponse[]> {
    const stages = await this.gradeStageService.findAll();
    const responses: CalendarConfigResponse[] = [];
    for (const stage of stages) {
      responses.push(await this.findOrCreateForStage(stage.id));
    }
    return responses;
  }

  async findByStageId(gradeStageId: string): Promise<CalendarConfigResponse> {
    await this.gradeStageService.findById(gradeStageId); // 404s if the stage itself doesn't exist
    return this.findOrCreateForStage(gradeStageId);
  }

  /** The lookup every downstream consumer (timetable/attendance/teacher-subject-requirements)
   * uses instead of the old enum-keyed findByStage — resolves the grade's stage first, then its
   * config. Throws if the level isn't covered by any stage (a gap) rather than guessing. */
  async findByGradeLevel(level: number): Promise<CalendarConfigResponse> {
    const stage = await this.gradeStageService.resolveStageForLevel(level);
    if (!stage) {
      throw new NotFoundException(`No grade stage covers grade level ${level}.`);
    }
    return this.findOrCreateForStage(stage.id);
  }

  async upsert(gradeStageId: string, dto: UpsertCalendarConfigDto): Promise<CalendarConfigResponse> {
    await this.gradeStageService.findById(gradeStageId);
    let config = await this.repo.findOne({ where: { gradeStageId } });
    if (config) {
      config.workingDaysPerWeek = dto.workingDaysPerWeek;
      config.periodsPerDay = dto.periodsPerDay;
    } else {
      config = this.repo.create({
        gradeStageId,
        workingDaysPerWeek: dto.workingDaysPerWeek,
        periodsPerDay: dto.periodsPerDay,
      });
    }
    const saved = await this.repo.save(config);
    return this.toResponse(await this.repo.findOneOrFail({ where: { id: saved.id } }));
  }

  private async findOrCreateForStage(gradeStageId: string): Promise<CalendarConfigResponse> {
    let config = await this.repo.findOne({ where: { gradeStageId } });
    if (!config) {
      config = await this.repo.save(
        this.repo.create({
          gradeStageId,
          workingDaysPerWeek: DEFAULT_WORKING_DAYS_PER_WEEK,
          periodsPerDay: DEFAULT_PERIODS_PER_DAY,
        }),
      );
      config = await this.repo.findOneOrFail({ where: { id: config.id } });
    }
    return this.toResponse(config);
  }

  private toResponse(e: SchoolCalendarConfigEntity): CalendarConfigResponse {
    return {
      ...(instanceToPlain(e) as Omit<CalendarConfigResponse, 'totalWeeklySlots'>),
      totalWeeklySlots: e.workingDaysPerWeek * e.periodsPerDay,
    };
  }
}
