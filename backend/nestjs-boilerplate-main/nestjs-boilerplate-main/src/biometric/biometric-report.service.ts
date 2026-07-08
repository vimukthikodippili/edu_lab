import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { BiometricReleaseLogEntity } from './entities/biometric-release-log.entity';
import type { ReleaseResult, VerificationMethod } from './entities/biometric-release-log.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { NotificationService } from '../notification/notification.service';
import { StaffService } from '../staff/staff.service';
import { RoleEnum } from '../roles/roles.enum';
import { ReleaseLogQueryDto } from './dto/release-log-query.dto';

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface ReleaseLogEntry {
  id: string;
  guardianId: string;
  guardianName: string;
  studentSummary: string;
  result: ReleaseResult;
  confidence: number;
  verificationMethod: VerificationMethod;
  templateType: string;
  teachersNotified: number;
  verifiedAt: Date;
}

export interface DailySummaryDto {
  date: string;
  totalEvents: number;
  successful: number;
  failed: number;
  blacklisted: number;
  manualOverrides: number;
  events: ReleaseLogEntry[];
}

export interface PaginatedReleaseLog {
  data: ReleaseLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class BiometricReportService {
  private readonly logger = new Logger(BiometricReportService.name);

  constructor(
    @InjectRepository(BiometricReleaseLogEntity)
    private readonly logRepo: Repository<BiometricReleaseLogEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly notificationService: NotificationService,
    private readonly staffService: StaffService,
  ) {}

  // ── Public methods ─────────────────────────────────────────────────────────

  async getReleaseLog(query: ReleaseLogQueryDto): Promise<PaginatedReleaseLog> {
    const { start, end } = this.dayRange(query.date);
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);

    const [logs, total] = await this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.guardian', 'guardian')
      .where('log.verifiedAt >= :start', { start })
      .andWhere('log.verifiedAt <= :end', { end })
      .orderBy('log.verifiedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: await this.enrichLogs(logs),
      total,
      page,
      limit,
    };
  }

  async getDailySummary(dateStr?: string): Promise<DailySummaryDto> {
    const { start, end } = this.dayRange(dateStr);
    const logs = await this.logRepo.find({
      where: { verifiedAt: Between(start, end) },
      relations: ['guardian'],
      order: { verifiedAt: 'DESC' },
    });

    return {
      date: this.formatDate(dateStr ? new Date(dateStr) : new Date()),
      totalEvents: logs.length,
      successful: logs.filter((l) => l.result === 'match').length,
      failed: logs.filter((l) => l.result === 'no_match').length,
      blacklisted: logs.filter((l) => l.result === 'blacklisted').length,
      manualOverrides: logs.filter((l) => l.verificationMethod === 'manual_override').length,
      events: await this.enrichLogs(logs),
    };
  }

  async getIncidents(query: ReleaseLogQueryDto): Promise<PaginatedReleaseLog> {
    const { start, end } = this.dayRange(query.date);
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 20, 100);

    const [logs, total] = await this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.guardian', 'guardian')
      .where('log.verifiedAt >= :start', { start })
      .andWhere('log.verifiedAt <= :end', { end })
      .andWhere(
        '(log.result IN (:...incidentResults) OR log.verificationMethod = :overrideMethod)',
        { incidentResults: ['no_match', 'blacklisted'], overrideMethod: 'manual_override' },
      )
      .orderBy('log.verifiedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: await this.enrichLogs(logs),
      total,
      page,
      limit,
    };
  }

  // ── Daily cron — 23:55 every day ──────────────────────────────────────────

  @Cron('55 23 * * *')
  async compileDailySummary(): Promise<void> {
    try {
      const summary = await this.getDailySummary();

      const principalUsers = await this.userRepo.find({
        where: [{ role: { id: RoleEnum.principal } }, { role: { id: RoleEnum.admin } }],
        relations: ['role'],
      });

      for (const user of principalUsers) {
        if (!user.email) continue;
        const staff = await this.staffService.findByEmail(user.email);
        if (!staff) continue;
        void this.notificationService
          .createForStaff(
            staff.id,
            `Daily Security Summary — ${summary.date}`,
            `Total: ${summary.totalEvents} | ✓ ${summary.successful} released | ✗ ${summary.failed} failed | ⛔ ${summary.blacklisted} blacklisted | ⚠ ${summary.manualOverrides} manual`,
            'daily_security_summary',
          )
          .catch(() => undefined);
      }
    } catch (err: unknown) {
      this.logger.error(
        'compileDailySummary cron failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private dayRange(dateStr?: string): { start: Date; end: Date } {
    const base = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private async enrichLogs(logs: BiometricReleaseLogEntity[]): Promise<ReleaseLogEntry[]> {
    // Collect all unique student IDs from JSON-encoded arrays
    const allStudentIds = [
      ...new Set(
        logs.flatMap((l) => {
          try {
            return JSON.parse(l.studentIds) as string[];
          } catch {
            return [];
          }
        }),
      ),
    ];

    const studentMap = new Map<string, StudentEntity>();
    if (allStudentIds.length > 0) {
      const students = await this.studentRepo.findBy({ id: In(allStudentIds) });
      for (const s of students) {
        studentMap.set(s.id, s);
      }
    }

    return logs.map((log) => {
      const studentIds: string[] = (() => {
        try {
          return JSON.parse(log.studentIds) as string[];
        } catch {
          return [];
        }
      })();

      const studentSummary = studentIds
        .map((id) => studentMap.get(id))
        .filter((s): s is StudentEntity => s != null)
        .map((s) => `${s.firstName} ${s.lastName}`)
        .join(', ');

      return {
        id: log.id,
        guardianId: log.guardianId,
        guardianName: log.guardian
          ? `${log.guardian.firstName} ${log.guardian.lastName}`
          : 'Unknown',
        studentSummary: studentSummary || '—',
        result: log.result,
        confidence: Number(log.confidence),
        verificationMethod: log.verificationMethod,
        templateType: log.templateType,
        teachersNotified: log.teachersNotified,
        verifiedAt: log.verifiedAt,
      };
    });
  }
}
