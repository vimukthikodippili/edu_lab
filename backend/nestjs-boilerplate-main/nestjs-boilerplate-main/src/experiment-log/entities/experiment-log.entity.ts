import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { LabBookingEntity } from '../../labs/entities/lab-booking.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

/** One permanent academic record per lab session, mirroring ClassDiaryEntryEntity's own shape
 * and attachment convention exactly (jsonb `attachmentFileIds` + a virtual `attachments` field
 * populated after load — not a DB column, not a join table). Unlike class diary (keyed on
 * timetableEntryId+date, since one timetable slot repeats weekly), one LabBooking already IS a
 * single real session, so @Unique(['labBookingId']) alone is enough — no separate date column
 * needed, `labBooking.date` is authoritative. */
@Entity({ name: 'experiment_log' })
@Unique(['labBookingId'])
export class ExperimentLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  labBookingId: string;

  @ManyToOne(() => LabBookingEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labBookingId' })
  labBooking: LabBookingEntity;

  @Column({ type: 'varchar', length: 200 })
  experimentName: string;

  @Column({ type: 'text' })
  objective: string;

  @Column({ type: 'text' })
  procedureSummary: string;

  @Column({ type: 'text' })
  outcome: string;

  @Column({ type: 'jsonb', default: [] })
  attachmentFileIds: string[];

  // Virtual — populated by ExperimentLogService after loading (not a DB column), mirrors
  // ClassDiaryEntryEntity.attachments exactly.
  attachments?: { id: string; path: string }[];

  @Column({ type: 'uuid' })
  loggedById: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loggedById' })
  loggedBy: StaffEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  loggedAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
