import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum PtmEventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/** P5-PP-01 — FR-P5-PP-01. `cancellationCutoffHours` is a disclosed addition beyond the AI
 * prompt's literal model list — the AC requires the cancellation deadline to be "configurable,"
 * and this is the natural per-session home for it (same level as `slotDurationMinutes`). */
@Entity({ name: 'ptm_event' })
export class PTMEventEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int' })
  slotDurationMinutes: number;

  @Column({ type: 'int', default: 24 })
  cancellationCutoffHours: number;

  @Column({ type: 'enum', enum: PtmEventStatus, enumName: 'ptm_event_status', default: PtmEventStatus.DRAFT })
  status: PtmEventStatus;

  @Column({ type: 'uuid' })
  createdByStaffId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
