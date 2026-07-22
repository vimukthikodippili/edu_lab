import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { LateAlertEntity } from './entities/late-alert.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { NotificationService } from '../notification/notification.service';
import { LiveClassMonitorService, LiveClassStatusEntry } from '../live-class-monitor/live-class-monitor.service';

const NOTIFICATION_TYPE = 'late_class_alert';

@Injectable()
export class LateAlertService {
  constructor(
    @InjectRepository(LateAlertEntity)
    private readonly lateAlertRepo: Repository<LateAlertEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly liveClassMonitorService: LiveClassMonitorService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Every minute during a generous school-hours window — the status computation itself
   * (grey for a period whose start hasn't arrived yet) already makes a wider window harmless,
   * this just avoids the job spinning all night. */
  @Cron('* 6-19 * * 1-6')
  async checkAndCreateAlerts(): Promise<void> {
    const grid = await this.liveClassMonitorService.getTodayStatusGrid();
    const overdue = grid.filter((entry) => entry.status === 'red');
    for (const entry of overdue) {
      await this.createAlertAndNotify(entry);
    }
  }

  private async createAlertAndNotify(entry: LiveClassStatusEntry): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const existing = await this.lateAlertRepo.findOne({
      where: { timetableEntryId: entry.timetableEntryId, date: today },
    });
    if (existing) return;

    const minutesLate = Math.floor(
      (Date.now() - new Date(entry.periodStart).getTime()) / 60000,
    );

    try {
      await this.lateAlertRepo.save(
        this.lateAlertRepo.create({
          timetableEntryId: entry.timetableEntryId,
          date: today,
          minutesLate,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') return;
      throw error;
    }

    await this.notifyStaff(entry, minutesLate);
  }

  private async notifyStaff(entry: LiveClassStatusEntry, minutesLate: number): Promise<void> {
    const title = 'Class Overdue — No Check-In';
    const message = `${entry.teacherName} has not checked in to ${entry.subjectName} (Grade ${entry.gradeLevel} — ${entry.classSectionName}${
      entry.roomNumber ? `, ${entry.roomNumber}` : ''
    }) — ${minutesLate} min late.`;

    const principalUsers = await this.userRepo.find({
      where: { role: { id: RoleEnum.principal } },
      relations: ['role'],
    });
    for (const user of principalUsers) {
      if (!user.email) continue;
      const staff = await this.staffRepo.findOne({ where: { email: user.email } });
      if (!staff) continue;
      await this.notificationService
        .createForStaff(staff.id, title, message, NOTIFICATION_TYPE)
        .catch(() => undefined);
    }

    const sectionHeads = await this.staffRepo.find({
      where: {
        sectionHeadGradeFrom: LessThanOrEqual(entry.gradeLevel),
        sectionHeadGradeTo: MoreThanOrEqual(entry.gradeLevel),
      },
    });
    for (const staff of sectionHeads) {
      await this.notificationService
        .createForStaff(staff.id, title, message, NOTIFICATION_TYPE)
        .catch(() => undefined);
    }
  }

  async findAlerts(
    acknowledged: boolean | undefined,
    restrictToStaffId: string | null,
  ): Promise<LateAlertEntity[]> {
    let range: { from: number; to: number } | null = null;
    if (restrictToStaffId) {
      const staff = await this.staffRepo.findOne({ where: { id: restrictToStaffId } });
      if (staff?.sectionHeadGradeFrom == null || staff?.sectionHeadGradeTo == null) {
        return [];
      }
      range = { from: staff.sectionHeadGradeFrom, to: staff.sectionHeadGradeTo };
    }

    const alerts = await this.lateAlertRepo.find({
      where:
        acknowledged === undefined
          ? {}
          : { acknowledgedAt: acknowledged ? Not(IsNull()) : IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!range) return alerts;
    return alerts.filter((alert) => {
      const level = alert.timetableEntry.classSection.grade.level;
      return level >= range!.from && level <= range!.to;
    });
  }

  async acknowledge(
    id: string,
    staffId: string,
    isFullyPrivileged: boolean,
  ): Promise<LateAlertEntity> {
    const alert = await this.lateAlertRepo.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`Late alert ${id} not found.`);
    }

    if (!isFullyPrivileged) {
      const staff = await this.staffRepo.findOne({ where: { id: staffId } });
      const level = alert.timetableEntry.classSection.grade.level;
      const inRange =
        staff?.sectionHeadGradeFrom != null &&
        staff?.sectionHeadGradeTo != null &&
        level >= staff.sectionHeadGradeFrom &&
        level <= staff.sectionHeadGradeTo;
      if (!inRange) {
        throw new ForbiddenException('This alert is outside your assigned grade range.');
      }
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedByStaffId = staffId;
    return this.lateAlertRepo.save(alert);
  }
}
