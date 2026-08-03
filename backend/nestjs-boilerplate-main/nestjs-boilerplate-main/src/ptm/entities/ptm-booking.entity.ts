import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum PtmBookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

/** P5-PP-01 — FR-P5-PP-03/05. `ptmSlotId` is deliberately NOT unique at the table level — a
 * cancelled booking's slot reopens and can be booked again by someone else, producing a second
 * historical row against the same slot. At-most-one-CONFIRMED-booking-per-slot is enforced by the
 * locked transaction in `PTMBookingService.book()`, not a DB constraint (mirrors
 * `EventRegistrationService`'s capacity-check-inside-a-row-lock pattern). */
@Entity({ name: 'ptm_booking' })
export class PTMBookingEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ptmSlotId: string;

  @Column({ type: 'uuid' })
  guardianId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'timestamptz' })
  bookedAt: Date;

  @Column({ type: 'enum', enum: PtmBookingStatus, enumName: 'ptm_booking_status', default: PtmBookingStatus.CONFIRMED })
  status: PtmBookingStatus;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  reminderSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
