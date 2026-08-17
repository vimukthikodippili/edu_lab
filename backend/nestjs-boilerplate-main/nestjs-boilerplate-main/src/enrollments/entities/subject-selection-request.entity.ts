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
import { StudentEntity } from '../../students/entities/student.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { ALStreamEntity } from './al-stream.entity';
import { SubjectSelectionWindowEntity } from './subject-selection-window.entity';

export enum SubjectSelectionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// The first student-initiated approval-workflow entity in this codebase — status/decision shape
// is an exact mirror of LeaveRequestEntity, but the requester is a student, not staff.
@Entity({ name: 'subject_selection_request' })
export class SubjectSelectionRequestEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => StudentEntity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @Column({ type: 'uuid' })
  windowId: string;

  @ManyToOne(() => SubjectSelectionWindowEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'windowId' })
  window: SubjectSelectionWindowEntity;

  @Column({ type: 'int', nullable: true })
  streamId: number | null;

  @ManyToOne(() => ALStreamEntity, { nullable: true, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'streamId' })
  stream: ALStreamEntity | null;

  @Column({
    type: 'varchar',
    length: 20,
    enumName: 'subject_selection_status',
    default: SubjectSelectionStatus.PENDING,
  })
  status: SubjectSelectionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  submittedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => StaffEntity, { nullable: true, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: StaffEntity | null;

  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
