import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PTMEventEntity, PtmEventStatus } from './entities/ptm-event.entity';
import { PTMTeacherAvailabilityEntity } from './entities/ptm-teacher-availability.entity';
import { PTMSlotEntity, PtmSlotStatus } from './entities/ptm-slot.entity';
import { PTMBookingEntity, PtmBookingStatus } from './entities/ptm-booking.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { CreatePtmEventDto } from './dto/create-ptm-event.dto';
import { SubmitAvailabilityDto } from './dto/submit-availability.dto';

export interface PublishResult {
  event: PTMEventEntity;
  slotsGenerated: number;
}

export interface TeacherScheduleRow {
  slot: PTMSlotEntity;
  guardianName: string | null;
  studentName: string | null;
}

@Injectable()
export class PTMEventService {
  constructor(
    @InjectRepository(PTMEventEntity)
    private readonly eventRepo: Repository<PTMEventEntity>,

    @InjectRepository(PTMTeacherAvailabilityEntity)
    private readonly availabilityRepo: Repository<PTMTeacherAvailabilityEntity>,

    @InjectRepository(PTMSlotEntity)
    private readonly slotRepo: Repository<PTMSlotEntity>,

    @InjectRepository(PTMBookingEntity)
    private readonly bookingRepo: Repository<PTMBookingEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepo: Repository<GuardianEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  async create(dto: CreatePtmEventDto, actorStaffId: string): Promise<PTMEventEntity> {
    return this.eventRepo.save(
      this.eventRepo.create({
        name: dto.name,
        date: dto.date,
        slotDurationMinutes: dto.slotDurationMinutes,
        cancellationCutoffHours: dto.cancellationCutoffHours ?? 24,
        createdByStaffId: actorStaffId,
      }),
    );
  }

  async findAll(isGuardianCaller: boolean): Promise<PTMEventEntity[]> {
    return this.eventRepo.find({
      where: isGuardianCaller ? { status: PtmEventStatus.PUBLISHED } : {},
      order: { date: 'DESC' },
    });
  }

  async getById(id: string): Promise<PTMEventEntity> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`PTM event ${id} not found.`);
    }
    return event;
  }

  /** FR-P5-PP-02. A teacher's window is locked once the event is published — slots are generated
   * from whatever availability existed at that moment, so a late change afterward would silently
   * diverge from the real slots already offered to parents. */
  async submitAvailability(
    eventId: string,
    teacherId: string,
    dto: SubmitAvailabilityDto,
  ): Promise<PTMTeacherAvailabilityEntity> {
    const event = await this.getById(eventId);
    if (event.status !== PtmEventStatus.DRAFT) {
      throw new ConflictException('This PTM event has already been published — availability can no longer be changed.');
    }

    const existing = await this.availabilityRepo.findOne({ where: { ptmEventId: eventId, teacherId } });
    if (existing) {
      existing.startTime = dto.startTime;
      existing.endTime = dto.endTime;
      return this.availabilityRepo.save(existing);
    }
    return this.availabilityRepo.save(
      this.availabilityRepo.create({ ptmEventId: eventId, teacherId, startTime: dto.startTime, endTime: dto.endTime }),
    );
  }

  /** FR-P5-PP-01/03. One-shot per event — re-publishing would generate duplicate slots on top of
   * whatever was already offered/booked, mirroring `exam-seat-allocation.service.ts`'s
   * "already allocated" guard. */
  async publish(eventId: string): Promise<PublishResult> {
    const event = await this.getById(eventId);
    if (event.status !== PtmEventStatus.DRAFT) {
      throw new ConflictException('This PTM event has already been published.');
    }

    const availabilities = await this.availabilityRepo.find({ where: { ptmEventId: eventId } });
    const newSlots: PTMSlotEntity[] = [];

    for (const availability of availabilities) {
      newSlots.push(...this.sliceIntoSlots(event, availability));
    }

    if (newSlots.length > 0) {
      await this.slotRepo.save(newSlots);
    }

    event.status = PtmEventStatus.PUBLISHED;
    await this.eventRepo.save(event);

    return { event, slotsGenerated: newSlots.length };
  }

  /** Pure slicing logic — any remainder that doesn't fill a full slot is discarded, not rounded
   * up into a short final slot. */
  private sliceIntoSlots(event: PTMEventEntity, availability: PTMTeacherAvailabilityEntity): PTMSlotEntity[] {
    const slots: PTMSlotEntity[] = [];
    const dayStart = new Date(`${event.date}T00:00:00.000Z`);
    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);

    let cursor = new Date(dayStart);
    cursor.setUTCHours(startH, startM, 0, 0);
    const windowEnd = new Date(dayStart);
    windowEnd.setUTCHours(endH, endM, 0, 0);

    while (true) {
      const slotEnd = new Date(cursor.getTime() + event.slotDurationMinutes * 60000);
      if (slotEnd > windowEnd) break;
      slots.push(
        this.slotRepo.create({
          ptmEventId: event.id,
          teacherId: availability.teacherId,
          slotStartTime: new Date(cursor),
          slotEndTime: slotEnd,
        }),
      );
      cursor = slotEnd;
    }

    return slots;
  }

  async getTeacherSchedule(eventId: string, teacherId: string): Promise<TeacherScheduleRow[]> {
    const slots = await this.slotRepo.find({
      where: { ptmEventId: eventId, teacherId },
      order: { slotStartTime: 'ASC' },
    });
    if (slots.length === 0) return [];

    const bookedSlotIds = slots.filter((s) => s.status === PtmSlotStatus.BOOKED).map((s) => s.id);
    const bookings = bookedSlotIds.length
      ? await this.bookingRepo.find({
          where: { ptmSlotId: In(bookedSlotIds), status: PtmBookingStatus.CONFIRMED },
        })
      : [];
    const bookingBySlotId = new Map(bookings.map((b) => [b.ptmSlotId, b]));

    const guardianIds = [...new Set(bookings.map((b) => b.guardianId))];
    const studentIds = [...new Set(bookings.map((b) => b.studentId))];
    const guardians = guardianIds.length ? await this.guardianRepo.find({ where: { id: In(guardianIds) } }) : [];
    const students = studentIds.length ? await this.studentRepo.find({ where: { id: In(studentIds) } }) : [];
    const guardianById = new Map(guardians.map((g) => [g.id, g]));
    const studentById = new Map(students.map((s) => [s.id, s]));

    return slots.map((slot) => {
      const booking = bookingBySlotId.get(slot.id);
      const guardian = booking ? guardianById.get(booking.guardianId) : undefined;
      const student = booking ? studentById.get(booking.studentId) : undefined;
      return {
        slot,
        guardianName: guardian ? `${guardian.firstName} ${guardian.lastName}` : null,
        studentName: student ? `${student.firstName} ${student.lastName}` : null,
      };
    });
  }
}
