import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NotificationDeliveryLogEntity } from './entities/notification-delivery-log.entity';
import { MhaSessionEntity } from '../mha-session/entities/mha-session.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StaffEntity } from '../staff/entities/staff.entity';

export interface SafetyAlertListItem {
  id: string;
  alertId: string;
  sessionId: string;
  caseNumber: string;
  studentId: string;
  studentName: string;
  recipientStaffId: string;
  recipientName: string;
  channel: NotificationDeliveryLogEntity['channel'];
  status: NotificationDeliveryLogEntity['status'];
  attempts: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
}

/** MHA-133 — AC #3. Read-side for the Principal-only "Safety Alerts" feed. Batch-enriches with
 * session/student/staff names using the same lookup-map pattern as MhaSessionService.listSessions()
 * — no join, no N+1. */
@Injectable()
export class SafetyAlertsService {
  constructor(
    @InjectRepository(NotificationDeliveryLogEntity)
    private readonly logRepo: Repository<NotificationDeliveryLogEntity>,

    @InjectRepository(MhaSessionEntity)
    private readonly sessionRepo: Repository<MhaSessionEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  async listAlerts(): Promise<SafetyAlertListItem[]> {
    const rows = await this.logRepo.find({ order: { createdAt: 'DESC' } });
    if (rows.length === 0) return [];

    const sessionIds = [...new Set(rows.map((r) => r.sessionId))];
    const studentIds = [...new Set(rows.map((r) => r.studentId))];
    const staffIds = [...new Set(rows.map((r) => r.recipientStaffId))];

    const [sessions, students, staff] = await Promise.all([
      this.sessionRepo.find({ where: { id: In(sessionIds) } }),
      this.studentRepo.find({ where: { id: In(studentIds) } }),
      this.staffRepo.find({ where: { id: In(staffIds) } }),
    ]);

    const caseNumberBySessionId = new Map(sessions.map((s) => [s.id, s.caseNumber]));
    const studentNameById = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
    const staffNameById = new Map(staff.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

    return rows.map((r) => ({
      id: r.id,
      alertId: r.alertId,
      sessionId: r.sessionId,
      caseNumber: caseNumberBySessionId.get(r.sessionId) ?? 'Unknown Session',
      studentId: r.studentId,
      studentName: studentNameById.get(r.studentId) ?? 'Unknown Student',
      recipientStaffId: r.recipientStaffId,
      recipientName: staffNameById.get(r.recipientStaffId) ?? 'Unknown Staff',
      channel: r.channel,
      status: r.status,
      attempts: r.attempts,
      lastAttemptAt: r.lastAttemptAt,
      createdAt: r.createdAt,
    }));
  }
}
