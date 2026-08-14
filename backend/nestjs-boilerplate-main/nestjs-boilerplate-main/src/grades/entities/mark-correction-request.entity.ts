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

export enum MarkCorrectionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'mark_correction_request' })
export class MarkCorrectionRequestEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Bare column, no FK — matches this module's existing loose-coupling convention for
  // cross-entity references within `grades` (e.g. MarkTopicScoreEntity.markId).
  @Column({ type: 'uuid' })
  markId: string;

  @Column({ type: 'uuid' })
  requestedByTeacherId: string;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  originalScore: string;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  correctedScore: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: MarkCorrectionStatus.PENDING })
  status: MarkCorrectionStatus;

  @Column({ type: 'uuid', nullable: true })
  decidedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;

  @ManyToOne(() => StaffEntity, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'requestedByTeacherId' })
  requestedByTeacher: StaffEntity;

  @ManyToOne(() => StaffEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
    eager: false,
  })
  @JoinColumn({ name: 'decidedById' })
  decidedBy: StaffEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
