import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { EventStudentParticipantEntity } from './entities/event-student-participant.entity';
import { EventStudentAttendanceEntity, EventStudentAttendanceMethod } from './entities/event-student-attendance.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { AddParticipantsDto } from './dto/add-participants.dto';
import { AuditService } from '../audit/audit.service';

export interface ParticipantRow {
  participant: EventStudentParticipantEntity;
  studentName: string;
  className: string;
  checkedInAt: Date | null;
}

export interface MyParticipation {
  participant: EventStudentParticipantEntity;
  checkedInAt: Date | null;
}

/** P5-EV-02 — FR-P5-EV-16. Admin/principal decides which classes/students are expected at an
 * event; each gets an individually-issued QR (folded onto `EventStudentParticipantEntity`, see
 * that entity's own comment). The class teacher can separately bulk-check-in their whole class
 * without scanning each student — idempotent, safe to tap twice. */
@Injectable()
export class EventParticipantService {
  constructor(
    @InjectRepository(EventStudentParticipantEntity)
    private readonly participantRepo: Repository<EventStudentParticipantEntity>,

    @InjectRepository(EventStudentAttendanceEntity)
    private readonly studentAttendanceRepo: Repository<EventStudentAttendanceEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    private readonly auditService: AuditService,
  ) {}

  async addParticipants(
    eventId: string,
    dto: AddParticipantsDto,
    addedByStaffId: string,
  ): Promise<EventStudentParticipantEntity[]> {
    const classSectionIds = dto.classSectionIds ?? [];
    const explicitStudentIds = dto.studentIds ?? [];
    if (classSectionIds.length === 0 && explicitStudentIds.length === 0) {
      throw new BadRequestException('Provide at least one class section or student.');
    }

    const resolvedStudentIds = new Set(explicitStudentIds);
    if (classSectionIds.length > 0) {
      const classStudents = await this.studentRepo.find({
        where: { classSectionId: In(classSectionIds), status: StudentStatus.ACTIVE },
      });
      classStudents.forEach((s) => resolvedStudentIds.add(s.id));
    }
    if (resolvedStudentIds.size === 0) return [];

    const existing = await this.participantRepo.find({
      where: { eventId, studentId: In([...resolvedStudentIds]) },
    });
    const existingStudentIds = new Set(existing.map((e) => e.studentId));
    const newStudentIds = [...resolvedStudentIds].filter((id) => !existingStudentIds.has(id));

    const created: EventStudentParticipantEntity[] = [];
    for (const studentId of newStudentIds) {
      const id = randomUUID();
      const qrCode = await QRCode.toDataURL(id, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: { dark: '#1a1a2e', light: '#ffffff' },
      });
      const participant = this.participantRepo.create({
        id,
        eventId,
        studentId,
        addedByStaffId,
        qrCode,
        issuedAt: new Date(),
      });
      created.push(await this.participantRepo.save(participant));
    }

    if (created.length > 0) {
      await this.auditService.log({
        actorId: addedByStaffId,
        action: 'add_participants',
        targetType: 'event',
        targetId: eventId,
      });
    }

    return created;
  }

  async listParticipants(eventId: string): Promise<ParticipantRow[]> {
    const participants = await this.participantRepo.find({ where: { eventId }, order: { createdAt: 'ASC' } });
    if (participants.length === 0) return [];

    const studentIds = [...new Set(participants.map((p) => p.studentId))];
    const students = await this.studentRepo.find({ where: { id: In(studentIds) } });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const classSectionIds = [...new Set(students.map((s) => s.classSectionId))];
    const classSections = classSectionIds.length
      ? await this.classSectionRepo.find({ where: { id: In(classSectionIds) } })
      : [];
    const classSectionMap = new Map(classSections.map((c) => [c.id, c]));

    const attendances = await this.studentAttendanceRepo.find({
      where: { eventStudentParticipantId: In(participants.map((p) => p.id)) },
    });
    const attendanceMap = new Map(attendances.map((a) => [a.eventStudentParticipantId, a]));

    return participants.map((participant) => {
      const student = studentMap.get(participant.studentId);
      const classSection = student ? classSectionMap.get(student.classSectionId) : undefined;
      return {
        participant,
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        className: classSection?.name ?? '-',
        checkedInAt: attendanceMap.get(participant.id)?.scannedAt ?? null,
      };
    });
  }

  async getMyParticipation(eventId: string, studentId: string): Promise<MyParticipation> {
    const participant = await this.participantRepo.findOne({ where: { eventId, studentId } });
    if (!participant) {
      throw new NotFoundException('You are not registered as a participant for this event.');
    }
    const attendance = await this.studentAttendanceRepo.findOne({
      where: { eventStudentParticipantId: participant.id },
    });
    return { participant, checkedInAt: attendance?.scannedAt ?? null };
  }

  /** Enforces "only this section's own class teacher may do this" — the same guard used
   * throughout the Attendance/Student Notes modules for class-teacher-scoped actions. */
  async classTeacherBulkCheckIn(
    eventId: string,
    classSectionId: number,
    teacherStaffId: string,
  ): Promise<number> {
    const section = await this.classSectionRepo.findOne({ where: { id: classSectionId } });
    if (!section) {
      throw new NotFoundException(`Class section ${classSectionId} not found.`);
    }
    if (section.classTeacherStaffId !== teacherStaffId) {
      throw new ForbiddenException('Only the class teacher of this section may bulk-check-in their class.');
    }

    const students = await this.studentRepo.find({ where: { classSectionId, status: StudentStatus.ACTIVE } });
    if (students.length === 0) return 0;

    const participants = await this.participantRepo.find({
      where: { eventId, studentId: In(students.map((s) => s.id)) },
    });
    if (participants.length === 0) return 0;

    const existingAttendances = await this.studentAttendanceRepo.find({
      where: { eventStudentParticipantId: In(participants.map((p) => p.id)) },
    });
    const alreadyCheckedInIds = new Set(existingAttendances.map((a) => a.eventStudentParticipantId));
    const toMark = participants.filter((p) => !alreadyCheckedInIds.has(p.id));
    if (toMark.length === 0) return 0;

    const scannedAt = new Date();
    const rows = toMark.map((p) =>
      this.studentAttendanceRepo.create({
        eventStudentParticipantId: p.id,
        scannedAt,
        scannedById: teacherStaffId,
        method: EventStudentAttendanceMethod.CLASS_TEACHER_BULK,
      }),
    );
    await this.studentAttendanceRepo.save(rows);
    return rows.length;
  }
}
