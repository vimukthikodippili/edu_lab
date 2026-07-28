import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
// pdfmake 0.2.x uses CommonJS export — must use require() form
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import { EventEntity, EventStatus } from './entities/event.entity';
import { EventRegistrationEntity, EventRegistrationStatus } from './entities/event-registration.entity';
import { EventTicketEntity } from './entities/event-ticket.entity';
import { EventAttendanceEntity } from './entities/event-attendance.entity';
import { EventStudentParticipantEntity } from './entities/event-student-participant.entity';
import { EventStudentAttendanceEntity, EventStudentAttendanceMethod } from './entities/event-student-attendance.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';

export interface GuardianScanResult {
  type: 'guardian';
  guestName: string;
  childName: string | null;
  scannedAt: Date;
}

export interface StudentScanResult {
  type: 'student';
  studentName: string;
  className: string | null;
  scannedAt: Date;
}

export type ScanResult = GuardianScanResult | StudentScanResult;

export interface AttendanceDashboard {
  capacity: number;
  registeredCount: number;
  checkedInCount: number;
  noShowCount: number;
  participantsExpectedCount: number;
  participantsCheckedInCount: number;
}

// Built-in Helvetica fonts — no external font files required for server-side pdfmake
const PDF_FONTS: Record<string, TFontFamilyTypes> = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

/** P5-EV-02 — FR-P5-EV-13/14/15/16. Guardian-ticket check-in (`EventAttendanceEntity`) and
 * student-participant check-in (`EventStudentAttendanceEntity`) are two separate models, but gate
 * staff scan one QR without knowing in advance which kind it is — `scanCode()` is the one door
 * both check-in paths share, trying a ticket lookup first and falling back to a participant
 * lookup. Not audit-logged (routine, high-volume — matches event-registration's own precedent). */
@Injectable()
export class EventAttendanceService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,

    @InjectRepository(EventRegistrationEntity)
    private readonly registrationRepo: Repository<EventRegistrationEntity>,

    @InjectRepository(EventTicketEntity)
    private readonly ticketRepo: Repository<EventTicketEntity>,

    @InjectRepository(EventAttendanceEntity)
    private readonly attendanceRepo: Repository<EventAttendanceEntity>,

    @InjectRepository(EventStudentParticipantEntity)
    private readonly participantRepo: Repository<EventStudentParticipantEntity>,

    @InjectRepository(EventStudentAttendanceEntity)
    private readonly studentAttendanceRepo: Repository<EventStudentAttendanceEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,
  ) {}

  private async getEventOrThrow(eventId: string): Promise<EventEntity> {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found.`);
    }
    return event;
  }

  async scanCode(eventId: string, code: string, scannedById: string): Promise<ScanResult> {
    const event = await this.getEventOrThrow(eventId);
    if (event.status === EventStatus.CANCELLED) {
      throw new ConflictException('This event has been cancelled.');
    }

    const ticket = await this.ticketRepo.findOne({ where: { id: code } });
    if (ticket) {
      return this.checkInGuardianTicket(eventId, ticket, scannedById);
    }

    const participant = await this.participantRepo.findOne({ where: { id: code } });
    if (participant) {
      return this.checkInStudentParticipant(eventId, participant, scannedById);
    }

    throw new NotFoundException('Invalid QR code — ticket not found.');
  }

  private async checkInGuardianTicket(
    eventId: string,
    ticket: EventTicketEntity,
    scannedById: string,
  ): Promise<GuardianScanResult> {
    const registration = await this.registrationRepo.findOne({ where: { id: ticket.eventRegistrationId } });
    if (!registration || registration.eventId !== eventId) {
      throw new ConflictException('This ticket is not valid for this event.');
    }
    if (registration.status !== EventRegistrationStatus.REGISTERED) {
      throw new ConflictException('This registration has been cancelled.');
    }

    const existing = await this.attendanceRepo.findOne({ where: { eventTicketId: ticket.id } });
    if (existing) {
      throw new ConflictException(`This ticket has already been used to check in at ${existing.scannedAt.toISOString()}.`);
    }

    const scannedAt = new Date();
    await this.attendanceRepo.save(
      this.attendanceRepo.create({ eventTicketId: ticket.id, scannedAt, scannedById }),
    );

    const [guardian, student] = await Promise.all([
      this.guardianRepo.findOne({ where: { id: registration.guardianId } }),
      registration.studentId ? this.studentRepo.findOne({ where: { id: registration.studentId } }) : Promise.resolve(null),
    ]);

    return {
      type: 'guardian',
      guestName: guardian ? `${guardian.firstName} ${guardian.lastName}` : 'Unknown guest',
      childName: student ? `${student.firstName} ${student.lastName}` : null,
      scannedAt,
    };
  }

  private async checkInStudentParticipant(
    eventId: string,
    participant: EventStudentParticipantEntity,
    scannedById: string,
  ): Promise<StudentScanResult> {
    if (participant.eventId !== eventId) {
      throw new ConflictException('This ticket is not valid for this event.');
    }

    const existing = await this.studentAttendanceRepo.findOne({
      where: { eventStudentParticipantId: participant.id },
    });
    if (existing) {
      throw new ConflictException(`This student has already been checked in at ${existing.scannedAt.toISOString()}.`);
    }

    const scannedAt = new Date();
    await this.studentAttendanceRepo.save(
      this.studentAttendanceRepo.create({
        eventStudentParticipantId: participant.id,
        scannedAt,
        scannedById,
        method: EventStudentAttendanceMethod.QR_SCAN,
      }),
    );

    const student = await this.studentRepo.findOne({ where: { id: participant.studentId } });
    const classSection = student ? await this.classSectionRepo.findOne({ where: { id: student.classSectionId } }) : null;

    return {
      type: 'student',
      studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown student',
      className: classSection?.name ?? null,
      scannedAt,
    };
  }

  async getDashboard(eventId: string): Promise<AttendanceDashboard> {
    const event = await this.getEventOrThrow(eventId);

    const registeredCount = await this.registrationRepo.count({
      where: { eventId, status: EventRegistrationStatus.REGISTERED },
    });

    const registrations = await this.registrationRepo.find({ where: { eventId } });
    const tickets = registrations.length
      ? await this.ticketRepo.find({ where: { eventRegistrationId: In(registrations.map((r) => r.id)) } })
      : [];
    const checkedInCount = tickets.length
      ? await this.attendanceRepo.count({ where: { eventTicketId: In(tickets.map((t) => t.id)) } })
      : 0;
    const noShowCount = Math.max(0, registeredCount - checkedInCount);

    const participants = await this.participantRepo.find({ where: { eventId } });
    const participantsExpectedCount = participants.length;
    const participantsCheckedInCount = participants.length
      ? await this.studentAttendanceRepo.count({
          where: { eventStudentParticipantId: In(participants.map((p) => p.id)) },
        })
      : 0;

    return {
      capacity: event.capacity,
      registeredCount,
      checkedInCount,
      noShowCount,
      participantsExpectedCount,
      participantsCheckedInCount,
    };
  }

  async generateAttendancePdf(eventId: string): Promise<Buffer> {
    const event = await this.getEventOrThrow(eventId);
    const dashboard = await this.getDashboard(eventId);

    const registrations = await this.registrationRepo.find({ where: { eventId }, order: { registeredAt: 'ASC' } });
    const guardianIds = [...new Set(registrations.map((r) => r.guardianId))];
    const guardians = guardianIds.length
      ? await this.guardianRepo.find({ where: { id: In(guardianIds) } })
      : [];
    const guardianMap = new Map(guardians.map((g) => [g.id, g]));

    const studentIds = [...new Set(registrations.map((r) => r.studentId).filter((id): id is string => !!id))];
    const students = studentIds.length ? await this.studentRepo.find({ where: { id: In(studentIds) } }) : [];
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const tickets = registrations.length
      ? await this.ticketRepo.find({ where: { eventRegistrationId: In(registrations.map((r) => r.id)) } })
      : [];
    const ticketByRegistrationId = new Map(tickets.map((t) => [t.eventRegistrationId, t]));
    const attendances = tickets.length
      ? await this.attendanceRepo.find({ where: { eventTicketId: In(tickets.map((t) => t.id)) } })
      : [];
    const attendanceByTicketId = new Map(attendances.map((a) => [a.eventTicketId, a]));

    const registrationRows = registrations.map((r, i) => {
      const guardian = guardianMap.get(r.guardianId);
      const student = r.studentId ? studentMap.get(r.studentId) : null;
      const ticket = ticketByRegistrationId.get(r.id);
      const attendance = ticket ? attendanceByTicketId.get(ticket.id) : undefined;
      const checkedIn = attendance ? `Yes @ ${attendance.scannedAt.toLocaleTimeString('en-LK')}` : ticket ? 'No' : '-';
      return [
        String(i + 1),
        guardian ? `${guardian.firstName} ${guardian.lastName}` : 'Unknown',
        student ? `${student.firstName} ${student.lastName}` : '-',
        r.status,
        checkedIn,
      ];
    });

    const participants = await this.participantRepo.find({ where: { eventId }, order: { createdAt: 'ASC' } });
    const pStudentIds = [...new Set(participants.map((p) => p.studentId))];
    const pStudents = pStudentIds.length ? await this.studentRepo.find({ where: { id: In(pStudentIds) } }) : [];
    const pStudentMap = new Map(pStudents.map((s) => [s.id, s]));
    const classSectionIds = [...new Set(pStudents.map((s) => s.classSectionId))];
    const classSections = classSectionIds.length
      ? await this.classSectionRepo.find({ where: { id: In(classSectionIds) } })
      : [];
    const classSectionMap = new Map(classSections.map((c) => [c.id, c]));
    const pAttendances = participants.length
      ? await this.studentAttendanceRepo.find({
          where: { eventStudentParticipantId: In(participants.map((p) => p.id)) },
        })
      : [];
    const pAttendanceMap = new Map(pAttendances.map((a) => [a.eventStudentParticipantId, a]));

    const participantRows = participants.map((p, i) => {
      const student = pStudentMap.get(p.studentId);
      const classSection = student ? classSectionMap.get(student.classSectionId) : undefined;
      const attendance = pAttendanceMap.get(p.id);
      const checkedIn = attendance ? `Yes @ ${attendance.scannedAt.toLocaleTimeString('en-LK')}` : 'No';
      return [
        String(i + 1),
        student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        classSection?.name ?? '-',
        checkedIn,
      ];
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const printer = new PdfPrinter(PDF_FONTS) as {
      createPdfKitDocument: (
        def: TDocumentDefinitions,
        options?: Record<string, unknown>,
      ) => NodeJS.EventEmitter & { end(): void };
    };

    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content: [
        { text: event.name, style: 'title' as string },
        { text: `${event.date}  |  ${event.venue}`, style: 'subtitle' as string },
        {
          text: `Generated: ${new Date().toLocaleString('en-LK')}`,
          style: 'meta' as string,
          margin: [0, 0, 0, 12],
        },
        {
          text: [
            { text: 'Capacity: ', bold: true }, `${dashboard.capacity}   `,
            { text: 'Registered: ', bold: true }, `${dashboard.registeredCount}   `,
            { text: 'Checked In: ', bold: true }, `${dashboard.checkedInCount}   `,
            { text: 'No-Show: ', bold: true }, `${dashboard.noShowCount}   `,
            { text: 'Students Expected: ', bold: true }, `${dashboard.participantsExpectedCount}   `,
            { text: 'Students Checked In: ', bold: true }, `${dashboard.participantsCheckedInCount}`,
          ],
          fontSize: 9,
          margin: [0, 0, 0, 14],
        },
        { text: 'Guardian Registrations', style: 'section' as string },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', '*', 'auto', 'auto'],
            body: [['#', 'Guardian', 'Child', 'Status', 'Checked In'], ...registrationRows],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 16],
        },
        { text: 'Student Participants', style: 'section' as string },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto'],
            body: [['#', 'Student', 'Class', 'Checked In'], ...participantRows],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        title: { fontSize: 18, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
        subtitle: { fontSize: 11, color: '#475569', margin: [0, 0, 0, 2] },
        meta: { fontSize: 9, color: '#94a3b8' },
        section: { fontSize: 12, bold: true, color: '#1e293b', margin: [0, 8, 0, 6] },
      },
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}
