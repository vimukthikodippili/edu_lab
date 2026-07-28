import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum EventRegistrationStatus {
  REGISTERED = 'registered',
  WAITLISTED = 'waitlisted',
  CANCELLED = 'cancelled',
}

/** P5-EV-01 — FR-P5-EV-07/09/11. Bare `eventId`/`guardianId`/`studentId` uuid columns, no
 * relations — matches the established MHA-family "child row of a parent" convention (services do
 * their own batch/manual joins). "Family" for the ticket-limit AC is "this guardianId, this
 * eventId" — Sibling Linking (FR-SM-10) was confirmed unbuilt anywhere in this codebase, so
 * guardianId is the only real household grouping that exists. */
@Entity({ name: 'event_registration' })
export class EventRegistrationEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  guardianId: string;

  @Column({ type: 'uuid', nullable: true })
  studentId: string | null;

  @Column({
    type: 'enum',
    enum: EventRegistrationStatus,
    enumName: 'event_registration_status',
  })
  status: EventRegistrationStatus;

  @Column({ type: 'timestamptz' })
  registeredAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  waitlistedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
