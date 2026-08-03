import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ExamEntity } from './entities/exam.entity';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatAllocationEntity } from './entities/exam-seat-allocation.entity';
import { ExamInvigilatorEntity } from './entities/exam-invigilator.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { ExamService } from './exam.service';
import { AssignInvigilatorsDto } from './dto/assign-invigilators.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms/sms.service';
import { PushService } from '../notification/push/push.service';

export interface InvigilatorRow {
  invigilator: ExamInvigilatorEntity;
  staffName: string;
  hallName: string;
}

export interface DayDashboardHallRow {
  hallId: string;
  hallName: string;
  invigilatorNames: string[];
  studentCount: number;
  startTime: string;
  endTime: string;
}

/** P5-EH-2 — FR-P5-EH-10/11/15. Invigilator assignment (with 3-channel notification, mirroring
 * `exam-seat-allocation.service.ts`'s own `notifyAllocations()` dispatch shape rather than the
 * heavier MHA queue-service pattern) and the exam-day oversight dashboard. Grade-range checks are
 * delegated to `ExamService.assertSectionHeadCanActOnGrade`, same as every other action in this
 * module. */
@Injectable()
export class ExamInvigilatorService {
  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepo: Repository<ExamEntity>,

    @InjectRepository(ExamHallEntity)
    private readonly hallRepo: Repository<ExamHallEntity>,

    @InjectRepository(ExamSeatAllocationEntity)
    private readonly allocationRepo: Repository<ExamSeatAllocationEntity>,

    @InjectRepository(ExamInvigilatorEntity)
    private readonly invigilatorRepo: Repository<ExamInvigilatorEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    private readonly examService: ExamService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  async assignInvigilators(
    examId: string,
    examHallId: string,
    dto: AssignInvigilatorsDto,
    actorStaffId: string,
    isFullyPrivileged: boolean,
    isSectionHead: boolean,
  ): Promise<ExamInvigilatorEntity[]> {
    const exam = await this.getExamOrThrow(examId);
    if (!isFullyPrivileged) {
      await this.examService.assertSectionHeadCanActOnGrade(actorStaffId, isSectionHead, exam.gradeId);
    }

    const hall = await this.hallRepo.findOne({ where: { id: examHallId } });
    if (!hall) {
      throw new NotFoundException(`Exam hall ${examHallId} not found.`);
    }

    const existing = await this.invigilatorRepo.find({
      where: { examId, examHallId, staffId: In(dto.staffIds) },
    });
    const alreadyAssignedIds = new Set(existing.map((e) => e.staffId));
    const newStaffIds = dto.staffIds.filter((id) => !alreadyAssignedIds.has(id));
    if (newStaffIds.length === 0) return [];

    const created = await this.invigilatorRepo.save(
      newStaffIds.map((staffId) => this.invigilatorRepo.create({ examId, examHallId, staffId })),
    );

    await this.auditService.log({
      actorId: actorStaffId,
      action: 'assign_invigilator',
      targetType: 'exam',
      targetId: examId,
    });

    await this.notifyInvigilators(exam, hall, newStaffIds);

    return created;
  }

  async listInvigilators(examId: string): Promise<InvigilatorRow[]> {
    await this.getExamOrThrow(examId);
    const rows = await this.invigilatorRepo.find({ where: { examId }, order: { createdAt: 'ASC' } });
    if (rows.length === 0) return [];

    const [staff, halls] = await Promise.all([
      this.staffRepo.find({ where: { id: In([...new Set(rows.map((r) => r.staffId))]) } }),
      this.hallRepo.find({ where: { id: In([...new Set(rows.map((r) => r.examHallId))]) } }),
    ]);
    const staffMap = new Map(staff.map((s) => [s.id, s]));
    const hallMap = new Map(halls.map((h) => [h.id, h]));

    return rows.map((invigilator) => {
      const s = staffMap.get(invigilator.staffId);
      return {
        invigilator,
        staffName: s ? `${s.firstName} ${s.lastName}` : 'Unknown',
        hallName: hallMap.get(invigilator.examHallId)?.name ?? '-',
      };
    });
  }

  async getDayDashboard(examId: string): Promise<DayDashboardHallRow[]> {
    const exam = await this.getExamOrThrow(examId);

    const allocations = await this.allocationRepo.find({ where: { examId } });
    if (allocations.length === 0) return [];

    const hallIds = [...new Set(allocations.map((a) => a.examHallId))];
    const [halls, invigilators] = await Promise.all([
      this.hallRepo.find({ where: { id: In(hallIds) } }),
      this.invigilatorRepo.find({ where: { examId, examHallId: In(hallIds) } }),
    ]);
    const staff = invigilators.length
      ? await this.staffRepo.find({ where: { id: In([...new Set(invigilators.map((i) => i.staffId))]) } })
      : [];
    const staffMap = new Map(staff.map((s) => [s.id, s]));

    const countByHall = new Map<string, number>();
    for (const a of allocations) {
      countByHall.set(a.examHallId, (countByHall.get(a.examHallId) ?? 0) + 1);
    }
    const invigilatorNamesByHall = new Map<string, string[]>();
    for (const inv of invigilators) {
      const names = invigilatorNamesByHall.get(inv.examHallId) ?? [];
      const s = staffMap.get(inv.staffId);
      names.push(s ? `${s.firstName} ${s.lastName}` : 'Unknown');
      invigilatorNamesByHall.set(inv.examHallId, names);
    }

    return halls
      .filter((h) => hallIds.includes(h.id))
      .map((hall) => ({
        hallId: hall.id,
        hallName: hall.name,
        invigilatorNames: invigilatorNamesByHall.get(hall.id) ?? [],
        studentCount: countByHall.get(hall.id) ?? 0,
        startTime: exam.startTime,
        endTime: exam.endTime,
      }));
  }

  private async getExamOrThrow(examId: string): Promise<ExamEntity> {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }
    return exam;
  }

  private async notifyInvigilators(exam: ExamEntity, hall: ExamHallEntity, staffIds: string[]): Promise<void> {
    const staff = await this.staffRepo.find({ where: { id: In(staffIds) } });
    if (staff.length === 0) return;

    const studentCount = await this.allocationRepo.count({ where: { examId: exam.id, examHallId: hall.id } });
    const title = 'Invigilation Assignment';
    const message = `You have been assigned to invigilate ${exam.name} in ${hall.name} on ${exam.date} at ${exam.startTime}. Expected students: ${studentCount}.`;

    const dispatches = staff.flatMap((s) => [
      this.notificationService.createForStaff(s.id, title, message, 'invigilation_assigned'),
      this.smsService.sendSms(s.phone, message),
      s.pushToken ? this.pushService.sendPush(s.pushToken, title, message) : Promise.resolve(),
    ]);

    await Promise.allSettled(dispatches);
  }
}
