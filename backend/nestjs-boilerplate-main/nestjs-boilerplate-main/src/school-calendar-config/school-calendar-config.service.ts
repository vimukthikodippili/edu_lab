import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { Repository } from 'typeorm';
import { GradeStage } from '../students/entities/grade.entity';
import { SchoolCalendarConfigEntity } from './entities/school-calendar-config.entity';
import { UpsertCalendarConfigDto } from './dto/upsert-calendar-config.dto';

export interface CalendarConfigResponse {
  id: number;
  gradeStage: string;
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
  ) {}

  async findAll(): Promise<CalendarConfigResponse[]> {
    const configs = await this.repo.find({ order: { gradeStage: 'ASC' } });
    return configs.map((c) => this.toResponse(c));
  }

  async findByStage(stage: GradeStage): Promise<CalendarConfigResponse> {
    const config = await this.repo.findOne({ where: { gradeStage: stage } });
    if (!config) {
      throw new NotFoundException(`No calendar config found for stage '${stage}'`);
    }
    return this.toResponse(config);
  }

  async upsert(stage: GradeStage, dto: UpsertCalendarConfigDto): Promise<CalendarConfigResponse> {
    let config = await this.repo.findOne({ where: { gradeStage: stage } });
    if (config) {
      config.workingDaysPerWeek = dto.workingDaysPerWeek;
      config.periodsPerDay = dto.periodsPerDay;
    } else {
      config = this.repo.create({
        gradeStage: stage,
        workingDaysPerWeek: dto.workingDaysPerWeek,
        periodsPerDay: dto.periodsPerDay,
      });
    }
    const saved = await this.repo.save(config);
    return this.toResponse(saved);
  }

  private toResponse(e: SchoolCalendarConfigEntity): CalendarConfigResponse {
    return {
      ...(instanceToPlain(e) as Omit<CalendarConfigResponse, 'totalWeeklySlots'>),
      totalWeeklySlots: e.workingDaysPerWeek * e.periodsPerDay,
    };
  }
}
