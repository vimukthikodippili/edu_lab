import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LabBookingEntity } from './entities/lab-booking.entity';
import { LabEntity } from './entities/lab.entity';
import { CreateLabBookingDto } from './dto/create-lab-booking.dto';
import { CreateRecurringLabBookingDto } from './dto/create-recurring-lab-booking.dto';
import { TimetableEntryEntity } from '../timetable/entities/timetable-entry.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { NotificationService } from '../notification/notification.service';
import { computeRecurringDates } from './lab-recurring';

export interface RecurringBookingResult {
  created: LabBookingEntity[];
  skipped: { date: string; reason: string }[];
}

function toDateString(value: string | Date): string {
  return value instanceof Date ? value.toISOString().split('T')[0] : value;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function dayOfWeekOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

@Injectable()
export class LabBookingService {
  constructor(
    @InjectRepository(LabBookingEntity)
    private readonly bookingRepo: Repository<LabBookingEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,

    @InjectRepository(TimetableEntryEntity)
    private readonly timetableEntryRepo: Repository<TimetableEntryEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,

    @InjectRepository(AcademicTermEntity)
    private readonly termRepo: Repository<AcademicTermEntity>,

    private readonly notificationService: NotificationService,
  ) {}

  async createBooking(
    labId: string,
    dto: CreateLabBookingDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<LabBookingEntity> {
    const lab = await this.labRepo.findOne({ where: { id: labId } });
    if (!lab) throw new NotFoundException(`Lab ${labId} not found.`);

    if (lab.isUnderMaintenance) {
      throw new ConflictException(
        'This lab is currently under maintenance and cannot be booked.',
      );
    }

    const { classSectionId, subjectId, timetableEntryId } = await this.resolveClassAndSubject(
      dto.date,
      staffId,
      isPrivileged,
      dto.timetableEntryId,
      dto.classSectionId,
      dto.subjectId,
    );

    await this.assertNoConflict(labId, dto.date, dto.periodNumber);

    const booking = this.bookingRepo.create({
      labId,
      date: dto.date,
      periodNumber: dto.periodNumber,
      timetableEntryId,
      classSectionId,
      subjectId,
      teacherId: staffId,
      status: 'confirmed',
      purpose: dto.purpose ?? null,
    });
    const saved = await this.bookingRepo.save(booking);

    await this.notificationService.createForStaff(
      lab.labInChargeId,
      'New Lab Booking',
      `${lab.name} has been booked for ${dto.date}, period ${dto.periodNumber}.`,
      'lab_booking_confirmed',
    );

    return saved;
  }

  async cancelBooking(
    labId: string,
    bookingId: string,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<LabBookingEntity> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId, labId } });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found.`);

    if (booking.status === 'cancelled') {
      throw new ConflictException('This booking is already cancelled.');
    }
    if (!isPrivileged && booking.teacherId !== staffId) {
      throw new ForbiddenException('You are not the teacher who made this booking.');
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledByStaffId = staffId;
    const saved = await this.bookingRepo.save(booking);

    const lab = await this.labRepo.findOne({ where: { id: labId } });
    if (lab) {
      await this.notificationService.createForStaff(
        lab.labInChargeId,
        'Lab Booking Cancelled',
        `${lab.name}'s booking for ${booking.date}, period ${booking.periodNumber} has been cancelled.`,
        'lab_booking_cancelled',
      );
    }

    return saved;
  }

  async createRecurringBooking(
    labId: string,
    dto: CreateRecurringLabBookingDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<RecurringBookingResult> {
    const lab = await this.labRepo.findOne({ where: { id: labId } });
    if (!lab) throw new NotFoundException(`Lab ${labId} not found.`);
    if (lab.isUnderMaintenance) {
      throw new ConflictException(
        'This lab is currently under maintenance and cannot be booked.',
      );
    }

    const term = await this.termRepo.findOne({ where: { id: dto.termId } });
    if (!term) throw new NotFoundException(`Academic term ${dto.termId} not found.`);

    await this.assertClassSectionExists(dto.classSectionId);
    await this.assertSubjectExists(dto.subjectId);

    let timetableEntryId: number | null = null;
    if (dto.timetableEntryId !== undefined) {
      const entry = await this.timetableEntryRepo.findOne({ where: { id: dto.timetableEntryId } });
      if (!entry) throw new NotFoundException(`Timetable entry ${dto.timetableEntryId} not found.`);
      if (!isPrivileged && entry.teacherId !== staffId) {
        throw new ForbiddenException('This timetable slot does not belong to you.');
      }
      if (entry.day !== dto.dayOfWeek) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { dayOfWeek: 'dayOfWeek does not match the linked timetable entry.' },
        });
      }
      timetableEntryId = entry.id;
    }

    const dates = computeRecurringDates(
      toDateString(term.startDate),
      toDateString(term.endDate),
      dto.dayOfWeek,
    );

    const created: LabBookingEntity[] = [];
    const skipped: { date: string; reason: string }[] = [];

    for (const date of dates) {
      const conflict = await this.bookingRepo.findOne({
        where: { labId, date, periodNumber: dto.periodNumber, status: 'confirmed' },
      });
      if (conflict) {
        skipped.push({ date, reason: 'Lab already booked for this date/period.' });
        continue;
      }

      const booking = this.bookingRepo.create({
        labId,
        date,
        periodNumber: dto.periodNumber,
        timetableEntryId,
        classSectionId: dto.classSectionId,
        subjectId: dto.subjectId,
        teacherId: staffId,
        status: 'confirmed',
        purpose: dto.purpose ?? null,
      });
      created.push(await this.bookingRepo.save(booking));
    }

    // One summary notification for the whole batch, not one per booking — a dozen near-identical
    // alerts for a single teacher action would just be noise for the Lab In-Charge.
    if (created.length > 0) {
      await this.notificationService.createForStaff(
        lab.labInChargeId,
        'Recurring Lab Booking Created',
        `${lab.name}: ${created.length} weekly booking(s) created from ${dates[0]} to ${dates[dates.length - 1]}` +
          (skipped.length > 0 ? ` (${skipped.length} date(s) skipped — already booked).` : '.'),
        'lab_booking_recurring_confirmed',
      );
    }

    return { created, skipped };
  }

  async findByLab(labId: string, weekStart?: string): Promise<LabBookingEntity[]> {
    if (weekStart) {
      const weekEnd = addDays(weekStart, 6);
      return this.bookingRepo.find({
        where: { labId, date: Between(weekStart, weekEnd) },
        order: { date: 'ASC', periodNumber: 'ASC' },
      });
    }

    return this.bookingRepo.find({
      where: { labId },
      order: { date: 'DESC', periodNumber: 'ASC' },
    });
  }

  private async resolveClassAndSubject(
    date: string,
    staffId: string,
    isPrivileged: boolean,
    timetableEntryId?: number,
    classSectionId?: number,
    subjectId?: string,
  ): Promise<{ classSectionId: number; subjectId: string; timetableEntryId: number | null }> {
    if (timetableEntryId !== undefined) {
      const entry = await this.timetableEntryRepo.findOne({ where: { id: timetableEntryId } });
      if (!entry) throw new NotFoundException(`Timetable entry ${timetableEntryId} not found.`);
      if (!isPrivileged && entry.teacherId !== staffId) {
        throw new ForbiddenException('This timetable slot does not belong to you.');
      }
      if (entry.day !== dayOfWeekOf(date)) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { date: 'date does not fall on the linked timetable entry\'s day.' },
        });
      }
      return { classSectionId: entry.classSectionId, subjectId: entry.subjectId, timetableEntryId: entry.id };
    }

    if (classSectionId === undefined || subjectId === undefined) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          classSectionId: 'classSectionId and subjectId are required when timetableEntryId is not provided.',
        },
      });
    }
    await this.assertClassSectionExists(classSectionId);
    await this.assertSubjectExists(subjectId);
    return { classSectionId, subjectId, timetableEntryId: null };
  }

  private async assertNoConflict(labId: string, date: string, periodNumber: number): Promise<void> {
    const existing = await this.bookingRepo.findOne({
      where: { labId, date, periodNumber, status: 'confirmed' },
    });
    if (existing) {
      throw new ConflictException(
        `This lab is already booked for ${date}, period ${periodNumber}.`,
      );
    }
  }

  private async assertClassSectionExists(classSectionId: number): Promise<void> {
    const exists = await this.classSectionRepo.findOne({ where: { id: classSectionId } });
    if (!exists) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { classSectionId: `Class section ${classSectionId} not found.` },
      });
    }
  }

  private async assertSubjectExists(subjectId: string): Promise<void> {
    const exists = await this.subjectRepo.findOne({ where: { id: subjectId } });
    if (!exists) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { subjectId: `Subject ${subjectId} not found.` },
      });
    }
  }
}
