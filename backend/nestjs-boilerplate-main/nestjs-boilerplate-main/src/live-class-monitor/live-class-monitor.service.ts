import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassCheckInEntity } from '../class-check-in/entities/class-check-in.entity';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import { AllConfigType } from '../config/config.type';
import { ClassMonitorStatus, computeClassStatus, computePeriodStart } from './class-status';

export interface LiveClassStatusEntry {
  timetableEntryId: number;
  period: number;
  periodStart: string;
  status: ClassMonitorStatus;
  teacherId: string;
  teacherName: string;
  classSectionId: number;
  classSectionName: string;
  gradeLevel: number;
  subjectName: string;
  roomNumber: string | null;
  checkedInAt: string | null;
}

@Injectable()
export class LiveClassMonitorService {
  constructor(
    @InjectRepository(TimetableEntryEntity)
    private readonly timetableRepo: Repository<TimetableEntryEntity>,

    @InjectRepository(ClassCheckInEntity)
    private readonly checkInRepo: Repository<ClassCheckInEntity>,

    private readonly schoolSettingsService: SchoolSettingsService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async getTodayStatusGrid(
    gradeFrom?: number,
    gradeTo?: number,
  ): Promise<LiveClassStatusEntry[]> {
    const now = new Date();
    const entries = await this.timetableRepo.find({ where: { day: now.getDay() } });

    const filtered = entries.filter((entry) => {
      if (gradeFrom == null && gradeTo == null) return true;
      const level = entry.classSection.grade.level;
      if (gradeFrom != null && level < gradeFrom) return false;
      if (gradeTo != null && level > gradeTo) return false;
      return true;
    });

    if (filtered.length === 0) return [];

    const today = now.toISOString().split('T')[0];
    const checkIns = await this.checkInRepo.find({
      where: {
        timetableEntryId: In(filtered.map((entry) => entry.id)),
        date: today,
      },
    });
    const checkInByEntryId = new Map(checkIns.map((c) => [c.timetableEntryId, c]));

    const schoolStartTime = this.configService.get('freePeriod.schoolStartTime', {
      infer: true,
    }) as string;
    const periodDurationMinutes = this.configService.get(
      'freePeriod.periodDurationMinutes',
      { infer: true },
    ) as number;
    const { lateThresholdMinutes } = await this.schoolSettingsService.get();

    const rows = filtered.map((entry): LiveClassStatusEntry => {
      const periodStart = computePeriodStart(
        now,
        entry.period,
        schoolStartTime,
        periodDurationMinutes,
      );
      const checkIn = checkInByEntryId.get(entry.id);

      return {
        timetableEntryId: entry.id,
        period: entry.period,
        periodStart: periodStart.toISOString(),
        status: computeClassStatus(periodStart, now, !!checkIn, lateThresholdMinutes),
        teacherId: entry.teacherId,
        teacherName: `${entry.teacher.firstName} ${entry.teacher.lastName}`,
        classSectionId: entry.classSectionId,
        classSectionName: entry.classSection.name,
        gradeLevel: entry.classSection.grade.level,
        subjectName: entry.subject.name,
        roomNumber: entry.roomNumber,
        checkedInAt: checkIn ? checkIn.checkedInAt.toISOString() : null,
      };
    });

    return rows.sort(
      (a, b) => a.period - b.period || a.classSectionName.localeCompare(b.classSectionName),
    );
  }
}
