import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum EventType {
  SPORTS_DAY = 'sports_day',
  PRIZE_GIVING = 'prize_giving',
  CULTURAL = 'cultural',
  PARENT_EVENING = 'parent_evening',
  OPEN_DAY = 'open_day',
  OTHER = 'other',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
}

/** P5-EV-01 — FR-P5-EV-01/04/06. `startTime`/`endTime` are plain `varchar` "HH:mm" (no complex
 * time arithmetic is needed anywhere in this story, unlike timetable period-conflict detection).
 * `createdByStaffId` is a bare Staff UUID, matching this codebase's established actor-id
 * convention (mha_session.counselorStaffId, counselor_case.closedByStaffId) — not a raw User id.
 * No `schoolId` — confirmed via research that no entity anywhere in this single-tenant codebase
 * has one; the AI prompt's literal field doesn't match this system's real architecture. */
@Entity({ name: 'event' })
export class EventEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: EventType, enumName: 'event_type' })
  eventType: EventType;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar' })
  startTime: string;

  @Column({ type: 'varchar' })
  endTime: string;

  @Column({ type: 'varchar' })
  venue: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int' })
  ticketsPerFamily: number;

  @Column({ type: 'enum', enum: EventStatus, enumName: 'event_status', default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ type: 'uuid' })
  createdByStaffId: string;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
