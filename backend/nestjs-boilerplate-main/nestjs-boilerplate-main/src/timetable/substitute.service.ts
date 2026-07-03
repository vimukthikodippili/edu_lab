import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  SubstituteAssignmentEntity,
  SubstituteStatus,
} from './entities/substitute-assignment.entity';
import { TimetableEntryEntity } from './entities/timetable-entry.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { LeaveApprovedEvent } from '../leave/events/leave-approved.event';
import { LeaveRequestEntity, LeaveStatus } from '../leave/entities/leave-request.entity';
import { NotificationService } from '../notification/notification.service';
import { RoleEnum } from '../roles/roles.enum';

export interface SubstituteCandidate {
  id: string;
  firstName: string;
  lastName: string;
  isSubjectExpert: boolean;
}

export interface SubstituteAssignmentDto {
  id: string;
  leaveRequestId: string;
  academicYear: string;
  day: number;
  period: number;
  absentTeacher: { id: string; firstName: string; lastName: string };
  classSection: { id: number; name: string };
  subject: { id: string; name: string };
  suggestedSubstitute: SubstituteCandidate | null;
  assignedSubstitute: SubstituteCandidate | null;
  candidates: SubstituteCandidate[];
  status: SubstituteStatus;
  assignedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class SubstituteService {
  private readonly logger = new Logger(SubstituteService.name);

  constructor(
    @InjectRepository(SubstituteAssignmentEntity)
    private readonly subAssignRepo: Repository<SubstituteAssignmentEntity>,

    @InjectRepository(TimetableEntryEntity)
    private readonly entryRepo: Repository<TimetableEntryEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRepo: Repository<LeaveRequestEntity>,

    private readonly notificationService: NotificationService,
  ) {}

  // ─── Free-teacher query ──────────────────────────────────────────────────────

  async findFreeCandidates(
    day: number,
    period: number,
    academicYear: string,
    subjectId: string,
  ): Promise<SubstituteCandidate[]> {
    // 1. Who is already booked at this slot?
    const busyEntries = await this.entryRepo.find({
      where: { day, period, academicYear },
      select: ['teacherId'],
    });
    const busyIds = new Set(busyEntries.map((e) => e.teacherId));

    // 2. Who is a subject expert?
    const expertRows = await this.requirementRepo.find({
      where: { subjectId },
      select: ['teacherId'],
    });
    const expertIds = new Set(expertRows.map((r) => r.teacherId));

    // 3. All active staff not busy at this slot
    const allActive = await this.staffRepo.find({
      where: { status: StaffStatus.ACTIVE },
      select: ['id', 'firstName', 'lastName'],
    });
    const free = allActive.filter((s) => !busyIds.has(s.id));

    // 4. Rank: subject experts first
    return free
      .sort((a, b) => (expertIds.has(b.id) ? 1 : 0) - (expertIds.has(a.id) ? 1 : 0))
      .map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        isSubjectExpert: expertIds.has(s.id),
      }));
  }

  // ─── Event processing ────────────────────────────────────────────────────────

  async processLeaveApprovedEvent(event: LeaveApprovedEvent): Promise<void> {
    const academicYear = event.startDate.getFullYear().toString();

    // Build list of calendar dates in leave range
    const dates = this.dateRange(event.startDate, event.endDate);

    let slotsCreated = 0;

    for (const date of dates) {
      const jsDay = date.getDay(); // 0=Sun … 6=Sat
      if (jsDay === 0) continue;  // skip Sunday (no timetable day)
      const timetableDay = jsDay; // 1=Mon … 6=Sat matches directly

      // Find entries where this teacher teaches on this weekday
      const entries = await this.entryRepo.find({
        where: { teacherId: event.staffId, day: timetableDay, academicYear },
        relations: ['classSection', 'subject'],
      });

      for (const entry of entries) {
        // Idempotency: skip if already created
        const exists = await this.subAssignRepo.findOne({
          where: {
            leaveRequestId: event.leaveRequestId,
            day: entry.day,
            period: entry.period,
            classSectionId: entry.classSectionId,
          },
        });
        if (exists) continue;

        const candidates = await this.findFreeCandidates(
          entry.day,
          entry.period,
          academicYear,
          entry.subjectId,
        );

        const suggestedId = candidates[0]?.id ?? null;

        await this.subAssignRepo.save(
          this.subAssignRepo.create({
            leaveRequestId: event.leaveRequestId,
            absentTeacherId: event.staffId,
            classSectionId: entry.classSectionId,
            subjectId: entry.subjectId,
            academicYear,
            day: entry.day,
            period: entry.period,
            suggestedSubstituteId: suggestedId,
            assignedSubstituteId: null,
            status: SubstituteStatus.SUGGESTED,
            assignedById: null,
            assignedAt: null,
          }),
        );

        slotsCreated++;
      }
    }

    if (slotsCreated === 0) {
      this.logger.log(
        `No timetable slots found for staff ${event.staffId} in academic year ${academicYear}.`,
      );
      return;
    }

    // Notify admin/section_head staff
    await this.notifyAdminStaff(event, slotsCreated, academicYear);
    this.logger.log(
      `Created ${slotsCreated} substitute suggestion(s) for leave ${event.leaveRequestId}.`,
    );
  }

  // ─── Reprocess (retry after table was missing) ───────────────────────────────

  async reprocessLeave(leaveRequestId: string): Promise<{ slotsCreated: number }> {
    const leave = await this.leaveRepo.findOne({ where: { id: leaveRequestId } });
    if (!leave) throw new NotFoundException(`Leave request ${leaveRequestId} not found.`);
    if (leave.status !== LeaveStatus.APPROVED) {
      throw new UnprocessableEntityException(
        `Leave request is not approved (current status: ${leave.status}).`,
      );
    }

    // date columns come back as strings from PostgreSQL — ensure real Date objects
    const event = new LeaveApprovedEvent(
      leave.id,
      leave.staffId,
      leave.leaveType,
      new Date(leave.startDate),
      new Date(leave.endDate),
    );

    await this.processLeaveApprovedEvent(event);

    const count = await this.subAssignRepo.count({ where: { leaveRequestId } });
    return { slotsCreated: count };
  }

  // ─── Admin list & assign ─────────────────────────────────────────────────────

  async findAll(status?: string): Promise<SubstituteAssignmentDto[]> {
    const where = status ? { status: status as SubstituteStatus } : {};
    const assignments = await this.subAssignRepo.find({
      where,
      relations: [
        'absentTeacher',
        'suggestedSubstitute',
        'assignedSubstitute',
        'classSection',
        'subject',
      ],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      assignments.map(async (a) => {
        const candidates = await this.findFreeCandidates(
          a.day,
          a.period,
          a.academicYear,
          a.subjectId,
        );
        return this.toDto(a, candidates);
      }),
    );
  }

  async assign(
    id: string,
    substituteStaffId: string,
    actorStaffId: string,
  ): Promise<SubstituteAssignmentDto> {
    const assignment = await this.subAssignRepo.findOne({
      where: { id },
      relations: [
        'absentTeacher',
        'suggestedSubstitute',
        'assignedSubstitute',
        'classSection',
        'subject',
      ],
    });
    if (!assignment) throw new NotFoundException(`Substitute assignment ${id} not found.`);
    if (assignment.status === SubstituteStatus.ASSIGNED) {
      throw new BadRequestException('This slot has already been assigned a substitute.');
    }

    // Verify the selected substitute is actually free at this slot
    const candidates = await this.findFreeCandidates(
      assignment.day,
      assignment.period,
      assignment.academicYear,
      assignment.subjectId,
    );
    const isFree = candidates.some((c) => c.id === substituteStaffId);
    if (!isFree) {
      throw new ConflictException(
        'The selected teacher is already booked for this period and cannot be assigned.',
      );
    }

    assignment.assignedSubstituteId = substituteStaffId;
    assignment.status = SubstituteStatus.ASSIGNED;
    assignment.assignedById = actorStaffId;
    assignment.assignedAt = new Date();

    const saved = await this.subAssignRepo.save(assignment);

    // Notify the assigned substitute
    const substitute = candidates.find((c) => c.id === substituteStaffId)!;
    const dayLabel = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][assignment.day] ?? `Day ${assignment.day}`;
    await this.notificationService.createForStaff(
      substituteStaffId,
      'Substitute Cover Assigned',
      `You have been assigned as substitute for ${assignment.classSection.name} — ` +
        `${assignment.subject.name} on ${dayLabel} Period ${assignment.period} ` +
        `(covering for ${assignment.absentTeacher.firstName} ${assignment.absentTeacher.lastName}).`,
      'substitute_assigned',
    );

    // Re-fetch with relations for the response
    const fresh = await this.subAssignRepo.findOne({
      where: { id: saved.id },
      relations: [
        'absentTeacher',
        'suggestedSubstitute',
        'assignedSubstitute',
        'classSection',
        'subject',
      ],
    });

    return this.toDto(fresh!, [
      { id: substitute.id, firstName: substitute.firstName, lastName: substitute.lastName, isSubjectExpert: substitute.isSubjectExpert },
    ]);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private dateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(0, 0, 0, 0);
    while (cur <= endNorm) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  private async notifyAdminStaff(
    event: LeaveApprovedEvent,
    slotsCreated: number,
    academicYear: string,
  ): Promise<void> {
    try {
      const adminUsers = await this.userRepo.find({
        where: [
          { role: { id: RoleEnum.admin } },
          { role: { id: RoleEnum.section_head } },
        ],
        relations: ['role'],
      });
      const emails = adminUsers
        .map((u) => u.email)
        .filter((e): e is string => !!e);
      if (!emails.length) return;

      const adminStaff = await this.staffRepo.find({
        where: { email: In(emails) },
        select: ['id'],
      });

      const startStr = event.startDate.toISOString().slice(0, 10);
      const endStr = event.endDate.toISOString().slice(0, 10);

      await Promise.all(
        adminStaff.map((s) =>
          this.notificationService.createForStaff(
            s.id,
            'Substitute Cover Needed',
            `${slotsCreated} slot(s) need substitute cover for leave approved ` +
              `(${event.leaveType}, ${startStr} – ${endStr}, ${academicYear}). ` +
              `Review in Staff › Substitute Cover.`,
            'substitute_suggestion',
          ),
        ),
      );
    } catch (err) {
      this.logger.warn(`Failed to notify admin staff: ${(err as Error).message}`);
    }
  }

  private staffDto(s: StaffEntity | null, expertIds?: Set<string>): SubstituteCandidate | null {
    if (!s) return null;
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      isSubjectExpert: expertIds ? expertIds.has(s.id) : false,
    };
  }

  private toDto(
    a: SubstituteAssignmentEntity,
    candidates: SubstituteCandidate[],
  ): SubstituteAssignmentDto {
    return {
      id: a.id,
      leaveRequestId: a.leaveRequestId,
      academicYear: a.academicYear,
      day: a.day,
      period: a.period,
      absentTeacher: {
        id: a.absentTeacher.id,
        firstName: a.absentTeacher.firstName,
        lastName: a.absentTeacher.lastName,
      },
      classSection: { id: a.classSection.id, name: a.classSection.name },
      subject: { id: a.subject.id, name: a.subject.name },
      suggestedSubstitute: a.suggestedSubstitute
        ? {
            id: a.suggestedSubstitute.id,
            firstName: a.suggestedSubstitute.firstName,
            lastName: a.suggestedSubstitute.lastName,
            isSubjectExpert: candidates.some(
              (c) => c.id === a.suggestedSubstituteId && c.isSubjectExpert,
            ),
          }
        : null,
      assignedSubstitute: a.assignedSubstitute
        ? {
            id: a.assignedSubstitute.id,
            firstName: a.assignedSubstitute.firstName,
            lastName: a.assignedSubstitute.lastName,
            isSubjectExpert: candidates.some(
              (c) => c.id === a.assignedSubstituteId && c.isSubjectExpert,
            ),
          }
        : null,
      candidates,
      status: a.status,
      assignedAt: a.assignedAt,
      createdAt: a.createdAt,
    };
  }
}
