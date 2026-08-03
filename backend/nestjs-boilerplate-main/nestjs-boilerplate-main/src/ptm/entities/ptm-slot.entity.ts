import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum PtmSlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
}

/** P5-PP-01 — FR-P5-PP-01/03. Generated once, on publish, by slicing each teacher's
 * `PTMTeacherAvailability` window into `PTMEvent.slotDurationMinutes` chunks. `slotStartTime`/
 * `slotEndTime` are absolute timestamps (not just time-of-day) — needed as-is by the 24-hour
 * reminder cron's `now + 24h` comparison. */
@Entity({ name: 'ptm_slot' })
export class PTMSlotEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ptmEventId: string;

  @Column({ type: 'uuid' })
  teacherId: string;

  @Column({ type: 'timestamptz' })
  slotStartTime: Date;

  @Column({ type: 'timestamptz' })
  slotEndTime: Date;

  @Column({ type: 'enum', enum: PtmSlotStatus, enumName: 'ptm_slot_status', default: PtmSlotStatus.AVAILABLE })
  status: PtmSlotStatus;

  @CreateDateColumn()
  createdAt: Date;
}
