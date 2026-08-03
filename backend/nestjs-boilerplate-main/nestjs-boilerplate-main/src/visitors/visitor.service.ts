import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { ILike, In, IsNull, LessThan, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
// pdfmake 0.2.x uses CommonJS export — must use require() form
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import { VisitorEntity, VisitorType } from './entities/visitor.entity';
import { VisitorLogEntity } from './entities/visitor-log.entity';
import { PreRegisteredVisitorEntity } from './entities/pre-registered-visitor.entity';
import { DailyVisitorSummaryEntity } from './entities/daily-visitor-summary.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { StaffService } from '../staff/staff.service';
import { StaffEntity } from '../staff/entities/staff.entity';
import { SignInVisitorDto } from './dto/sign-in-visitor.dto';
import { SetBlockedDto } from './dto/set-blocked.dto';
import { BlockNewVisitorDto } from './dto/block-new-visitor.dto';
import { SearchVisitorsDto } from './dto/search-visitors.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

const ALERT_ROLE_IDS = [RoleEnum.security_officer, RoleEnum.admin, RoleEnum.principal];

const PDF_FONTS: Record<string, TFontFamilyTypes> = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

export interface SignOutResult {
  log: VisitorLogEntity;
  durationMinutes: number;
}

export interface BadgeVerification {
  valid: boolean;
  reason?: string;
  log?: VisitorLogEntity;
}

export interface DailyVisitorSummary {
  date: string;
  totalVisitors: number;
  stillOnSite: number;
  signedOut: number;
  byType: Record<string, number>;
  averageDurationMinutes: number;
  overstayCount: number;
}

@Injectable()
export class VisitorService {
  constructor(
    @InjectRepository(VisitorEntity)
    private readonly visitorRepo: Repository<VisitorEntity>,

    @InjectRepository(VisitorLogEntity)
    private readonly logRepo: Repository<VisitorLogEntity>,

    @InjectRepository(PreRegisteredVisitorEntity)
    private readonly preRegRepo: Repository<PreRegisteredVisitorEntity>,

    @InjectRepository(DailyVisitorSummaryEntity)
    private readonly summaryRepo: Repository<DailyVisitorSummaryEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly staffService: StaffService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  /** Sign-in resolves an existing `Visitor` by (idType, idNumber) or creates one — without this,
   * a blocked person would just get a fresh, unblocked row on their next attempt. */
  private async findOrCreateVisitor(dto: SignInVisitorDto): Promise<VisitorEntity> {
    const existing = await this.visitorRepo.findOne({
      where: { idType: dto.idType, idNumber: dto.idNumber },
    });
    if (existing) {
      if (dto.photoId && existing.photoId !== dto.photoId) {
        existing.photoId = dto.photoId;
        await this.visitorRepo.save(existing);
      }
      return existing;
    }
    return this.visitorRepo.save(
      this.visitorRepo.create({
        fullName: dto.fullName,
        idNumber: dto.idNumber,
        idType: dto.idType,
        visitorType: dto.visitorType,
        photoId: dto.photoId ?? null,
      }),
    );
  }

  async signIn(dto: SignInVisitorDto, actorStaffId: string): Promise<VisitorLogEntity> {
    const visitor = await this.findOrCreateVisitor(dto);

    if (visitor.isBlocked) {
      await this.auditService.log({
        actorId: actorStaffId,
        action: 'visitor_blocked',
        targetType: 'visitor',
        targetId: visitor.id,
        reason: `Blocked sign-in attempt: ${dto.fullName} (${dto.idType} ${dto.idNumber})`,
      });
      await this.alertRoles(
        '🚫 Blocked Visitor Attempted Sign-In',
        `${dto.fullName} (${dto.idType.toUpperCase()} ${dto.idNumber}) — a blocked visitor — attempted to sign in. Do not admit.`,
      );
      throw new ForbiddenException('This visitor is blocked and cannot be signed in.');
    }

    const host = await this.staffService.findById(dto.hostStaffId);

    const id = randomUUID();
    const expectedDepartureTime = new Date(dto.expectedDepartureTime);
    const badgeQrCode = await QRCode.toDataURL(id, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    const log = await this.logRepo.save(
      this.logRepo.create({
        id,
        visitorId: visitor.id,
        purpose: dto.purpose,
        hostStaffId: dto.hostStaffId,
        expectedDepartureTime,
        signedInAt: new Date(),
        signedInById: actorStaffId,
        badgeQrCode,
        qrCodeExpiresAt: expectedDepartureTime,
        preRegistrationId: dto.preRegistrationId ?? null,
      }),
    );

    if (dto.preRegistrationId) {
      await this.preRegRepo.update({ id: dto.preRegistrationId }, { consumedVisitorLogId: log.id });
    }

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'visitor_sign_in',
      targetType: 'visitor',
      targetId: visitor.id,
    });

    await this.notifyHost(host, visitor.fullName, dto.purpose, expectedDepartureTime);

    return log;
  }

  async signOut(logId: string, actorStaffId: string): Promise<SignOutResult> {
    const log = await this.logRepo.findOne({ where: { id: logId } });
    if (!log) {
      throw new NotFoundException(`Visitor log ${logId} not found.`);
    }
    if (log.signedOutAt) {
      throw new ForbiddenException('This visitor has already been signed out.');
    }

    log.signedOutAt = new Date();
    log.signedOutById = actorStaffId;
    await this.logRepo.save(log);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'visitor_sign_out',
      targetType: 'visitor',
      targetId: log.visitorId,
    });

    const durationMinutes = Math.round(
      (log.signedOutAt.getTime() - log.signedInAt.getTime()) / 60000,
    );
    return { log, durationMinutes };
  }

  async listActive(): Promise<VisitorLogEntity[]> {
    return this.logRepo.find({
      where: { signedOutAt: IsNull() },
      order: { signedInAt: 'DESC' },
    });
  }

  async search(filters: SearchVisitorsDto): Promise<VisitorLogEntity[]> {
    let visitorIds: string[] | undefined;
    if (filters.name) {
      const matches = await this.visitorRepo.find({
        where: { fullName: ILike(`%${filters.name}%`) },
        select: ['id'],
      });
      visitorIds = matches.map((v) => v.id);
      if (visitorIds.length === 0) return [];
    }

    const query = this.logRepo.createQueryBuilder('log').orderBy('log.signedInAt', 'DESC');
    if (visitorIds) query.andWhere('log.visitorId IN (:...visitorIds)', { visitorIds });
    if (filters.purpose) query.andWhere('log.purpose ILIKE :purpose', { purpose: `%${filters.purpose}%` });
    if (filters.hostStaffId) query.andWhere('log.hostStaffId = :hostStaffId', { hostStaffId: filters.hostStaffId });
    if (filters.from) query.andWhere('log.signedInAt >= :from', { from: new Date(filters.from) });
    if (filters.to) query.andWhere('log.signedInAt <= :to', { to: new Date(filters.to) });

    return query.getMany();
  }

  /** FR-P5-VM-12. Shared by the on-demand `daily-report` endpoint (any date, always live) and
   * the once-daily `generateDailySummary` cron (which additionally persists + notifies). */
  async compileDailySummary(date: string): Promise<DailyVisitorSummary> {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const logs = await this.logRepo
      .createQueryBuilder('log')
      .where('log.signedInAt >= :dayStart AND log.signedInAt <= :dayEnd', { dayStart, dayEnd })
      .getMany();

    const visitorIds = [...new Set(logs.map((l) => l.visitorId))];
    const visitors = visitorIds.length
      ? await this.visitorRepo.find({ where: { id: In(visitorIds) } })
      : [];
    const visitorTypeById = new Map(visitors.map((v) => [v.id, v.visitorType]));

    const byType: Record<string, number> = {};
    for (const log of logs) {
      const type = visitorTypeById.get(log.visitorId) ?? VisitorType.OTHER;
      byType[type] = (byType[type] ?? 0) + 1;
    }

    const signedOutLogs = logs.filter((l) => !!l.signedOutAt);
    const averageDurationMinutes = signedOutLogs.length
      ? Math.round(
          signedOutLogs.reduce(
            (sum, l) => sum + (l.signedOutAt!.getTime() - l.signedInAt.getTime()) / 60000,
            0,
          ) / signedOutLogs.length,
        )
      : 0;

    return {
      date,
      totalVisitors: logs.length,
      stillOnSite: logs.length - signedOutLogs.length,
      signedOut: signedOutLogs.length,
      byType,
      averageDurationMinutes,
      overstayCount: logs.filter((l) => !!l.overstayAlertedAt).length,
    };
  }

  async getDailyReport(date: string): Promise<DailyVisitorSummary> {
    return this.compileDailySummary(date);
  }

  /** FR-P5-VM-12. Once daily at end of school day — persists the audit-anchor row (upserted, so
   * an accidental re-run the same day doesn't hit the `date` unique constraint) and notifies
   * every Principal. Numbers always come from `compileDailySummary`, the same function the
   * on-demand endpoint uses — no separate "cron math" to drift out of sync. */
  @Cron('0 18 * * 1-6')
  async generateDailySummary(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const summary = await this.compileDailySummary(today);

    const existing = await this.summaryRepo.findOne({ where: { date: today } });
    if (existing) {
      existing.totalVisitors = summary.totalVisitors;
      existing.byType = summary.byType;
      existing.averageDurationMinutes = summary.averageDurationMinutes;
      existing.overstayCount = summary.overstayCount;
      await this.summaryRepo.save(existing);
    } else {
      await this.summaryRepo.save(
        this.summaryRepo.create({
          date: today,
          totalVisitors: summary.totalVisitors,
          byType: summary.byType,
          averageDurationMinutes: summary.averageDurationMinutes,
          overstayCount: summary.overstayCount,
        }),
      );
    }

    await this.notifyPrincipal(summary);
  }

  private async notifyPrincipal(summary: DailyVisitorSummary): Promise<void> {
    const title = 'Daily Visitor Summary';
    const typeBreakdown = Object.entries(summary.byType)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    const message = `${summary.date} — ${summary.totalVisitors} visitor(s) (${typeBreakdown || 'none'}). Average visit ${summary.averageDurationMinutes} min. ${summary.overstayCount} overstay alert(s).`;

    const principals = await this.userRepo.find({
      where: { role: { id: RoleEnum.principal } },
      relations: ['role'],
    });
    for (const user of principals) {
      if (!user.email) continue;
      const staff = await this.staffService.findByEmail(user.email);
      if (!staff) continue;
      await this.notificationService
        .createForStaff(staff.id, title, message, 'daily_visitor_summary')
        .catch(() => undefined);
    }
  }

  async setBlocked(visitorId: string, dto: SetBlockedDto, actorStaffId: string): Promise<VisitorEntity> {
    const visitor = await this.visitorRepo.findOne({ where: { id: visitorId } });
    if (!visitor) {
      throw new NotFoundException(`Visitor ${visitorId} not found.`);
    }
    visitor.isBlocked = dto.isBlocked;
    visitor.blockedReason = dto.isBlocked ? dto.reason ?? null : null;
    await this.visitorRepo.save(visitor);

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'visitor_block',
      targetType: 'visitor',
      targetId: visitor.id,
      reason: dto.reason ?? null,
    });

    return visitor;
  }

  /** FR-P5-VM-14. For a person who has never actually visited — find-or-create the `Visitor` by
   * (idType, idNumber), same matching semantics as `findOrCreateVisitor`, and block it on the
   * spot. Complements `setBlocked`, which requires an already-known `visitorId`. */
  async blockNewVisitor(dto: BlockNewVisitorDto, actorStaffId: string): Promise<VisitorEntity> {
    let visitor = await this.visitorRepo.findOne({
      where: { idType: dto.idType, idNumber: dto.idNumber },
    });

    if (visitor) {
      visitor.isBlocked = true;
      visitor.blockedReason = dto.reason ?? null;
      await this.visitorRepo.save(visitor);
    } else {
      visitor = await this.visitorRepo.save(
        this.visitorRepo.create({
          fullName: dto.fullName,
          idNumber: dto.idNumber,
          idType: dto.idType,
          visitorType: VisitorType.OTHER,
          isBlocked: true,
          blockedReason: dto.reason ?? null,
        }),
      );
    }

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'visitor_block',
      targetType: 'visitor',
      targetId: visitor.id,
      reason: dto.reason ?? null,
    });

    return visitor;
  }

  /** FR-P5-VM-07 — optional printable badge, reusing `exam-hall-pdf.service.ts`'s pdfmake
   * scaffolding exactly (Helvetica-only, `createPdfKitDocument` streamed to a Buffer). */
  async generateBadgePdf(logId: string): Promise<Buffer> {
    const log = await this.logRepo.findOne({ where: { id: logId } });
    if (!log) {
      throw new NotFoundException(`Visitor log ${logId} not found.`);
    }
    const visitor = await this.visitorRepo.findOne({ where: { id: log.visitorId } });
    const host = await this.staffService.findById(log.hostStaffId);

    const docDefinition: TDocumentDefinitions = {
      pageSize: { width: 283.5, height: 425.2 }, // ~100mm x 150mm badge card
      pageMargins: [20, 20, 20, 20],
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'VISITOR', style: 'header', alignment: 'center' },
        { text: visitor?.fullName ?? '', style: 'name', alignment: 'center', margin: [0, 8, 0, 4] },
        { text: `Purpose: ${log.purpose}`, alignment: 'center', margin: [0, 0, 0, 2] },
        { text: `Host: ${host.firstName} ${host.lastName}`, alignment: 'center', margin: [0, 0, 0, 2] },
        {
          text: `Valid until: ${log.qrCodeExpiresAt.toLocaleString()}`,
          alignment: 'center',
          margin: [0, 0, 0, 12],
        },
        { image: log.badgeQrCode, width: 140, height: 140, alignment: 'center' },
      ],
      styles: {
        header: { fontSize: 12, bold: true },
        name: { fontSize: 16, bold: true },
      },
    };

    return this.renderPdf(new PdfPrinter(PDF_FONTS), docDefinition);
  }

  private renderPdf(
    printer: { createPdfKitDocument: (def: TDocumentDefinitions, options?: Record<string, unknown>) => NodeJS.EventEmitter & { end(): void } },
    docDefinition: TDocumentDefinitions,
  ): Promise<Buffer> {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  async verifyBadge(code: string): Promise<BadgeVerification> {
    const log = await this.logRepo.findOne({ where: { badgeQrCode: code } });
    if (!log) return { valid: false, reason: 'No badge found for this code.' };
    if (log.signedOutAt) return { valid: false, reason: 'This visitor has already signed out.', log };
    if (log.qrCodeExpiresAt.getTime() < Date.now()) {
      return { valid: false, reason: 'This badge has expired.', log };
    }
    return { valid: true, log };
  }

  /** FR-P5-VM-10. Runs every 5 minutes during school hours; `overstayAlertedAt` dedupes so a
   * still-overdue visitor doesn't re-alert on every tick, matching `late-alert.service.ts`'s
   * one-alert-per-condition convention. */
  @Cron('*/5 6-19 * * 1-6')
  async checkOverstays(): Promise<void> {
    const overdue = await this.logRepo.find({
      where: {
        signedOutAt: IsNull(),
        expectedDepartureTime: LessThan(new Date()),
        overstayAlertedAt: IsNull(),
      },
    });

    for (const log of overdue) {
      const visitor = await this.visitorRepo.findOne({ where: { id: log.visitorId } });
      await this.alertRoles(
        '⏰ Visitor Overstay Alert',
        `${visitor?.fullName ?? 'A visitor'} has not signed out — expected departure was ${log.expectedDepartureTime.toISOString()}.`,
      );
      log.overstayAlertedAt = new Date();
      await this.logRepo.save(log);
    }
  }

  private async notifyHost(
    host: StaffEntity,
    visitorName: string,
    purpose: string,
    expectedDepartureTime: Date,
  ): Promise<void> {
    const title = 'Visitor Signed In';
    const message = `${visitorName} has signed in to meet you — ${purpose}. Expected to leave by ${expectedDepartureTime.toLocaleTimeString()}.`;
    await Promise.allSettled([
      this.notificationService.createForStaff(host.id, title, message, 'visitor_arrived'),
      this.smsService.sendSms(host.phone, message),
      host.pushToken ? this.pushService.sendPush(host.pushToken, title, message) : Promise.resolve(),
    ]);
  }

  /** Notifies every Security Officer, Admin, and Principal — matches
   * `biometric.service.ts`'s `alertSecurityStaff` exactly (same audience, same role-loop shape). */
  private async alertRoles(title: string, message: string): Promise<void> {
    const users = await this.userRepo.find({
      where: ALERT_ROLE_IDS.map((id) => ({ role: { id } })),
      relations: ['role'],
    });
    for (const user of users) {
      if (!user.email) continue;
      const staff = await this.staffService.findByEmail(user.email);
      if (!staff) continue;
      await this.notificationService
        .createForStaff(staff.id, title, message, 'security_alert')
        .catch(() => undefined);
    }
  }
}
