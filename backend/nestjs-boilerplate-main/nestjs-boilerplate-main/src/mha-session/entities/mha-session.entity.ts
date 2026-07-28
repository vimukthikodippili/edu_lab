import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { TopFinding } from '../../top-findings/top-findings.service';

export enum MhaSessionStatus {
  DRAFT = 'draft',
  COMPLETE = 'complete',
  ABANDONED = 'abandoned',
}

/** FR-MHA-03/05 — the session "shell". Per-domain symptom checklists, risk levels, notes, and
 * safety flags (FR-MHA-08 to FR-MHA-25) are a later story's scope — this entity is the
 * foundation they'll extend with a child table. `studentId` is a bare FK with no relation,
 * matching this module family's established pattern (mha_consent, counselor_case). */
@Entity({ name: 'mha_session' })
export class MhaSessionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  caseNumber: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  counselorStaffId: string;

  @ManyToOne(() => StaffEntity, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'counselorStaffId' })
  counselor: StaffEntity;

  @Column({ type: 'date' })
  screeningDate: string;

  @Column({ type: 'enum', enum: MhaSessionStatus, enumName: 'mha_session_status', default: MhaSessionStatus.DRAFT })
  status: MhaSessionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /** MHA-132 — AC #62. Denormalized snapshot of High/Severe findings, computed once by
   * TopFindingsService at completion and read directly thereafter (no live recompute/join). */
  @Column({ type: 'jsonb', default: [] })
  topFindingsSnapshot: TopFinding[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
