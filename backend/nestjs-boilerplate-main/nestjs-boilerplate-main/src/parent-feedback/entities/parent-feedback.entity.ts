import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum FeedbackCategory {
  ACADEMIC = 'academic',
  FACILITIES = 'facilities',
  STAFF = 'staff',
  OTHER = 'other',
}

export enum FeedbackStatus {
  RECEIVED = 'received',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
}

/** P5-PP-03 — FR-P5-PP-12/16. `submittedAt` doubles as the creation timestamp (the AI prompt
 * names it explicitly; a second, always-identical `createdAt` would be pure redundancy). No
 * `schoolId` — matches the established single-tenant precedent across every Phase 5 module. */
@Entity({ name: 'parent_feedback' })
export class ParentFeedbackEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  guardianId: string;

  @Column({ type: 'uuid', nullable: true })
  studentId: string | null;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: FeedbackCategory, enumName: 'feedback_category' })
  category: FeedbackCategory;

  @Column({ type: 'enum', enum: FeedbackStatus, enumName: 'feedback_status', default: FeedbackStatus.RECEIVED })
  status: FeedbackStatus;

  @Column({ type: 'varchar', unique: true })
  referenceNumber: string;

  @Column({ type: 'timestamptz' })
  submittedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
