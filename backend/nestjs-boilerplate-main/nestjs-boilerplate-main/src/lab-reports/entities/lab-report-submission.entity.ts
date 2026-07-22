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
import { LabReportAssignmentEntity } from './lab-report-assignment.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

/** No row exists until the student actually submits — mirrors SubmissionEntity's (LMS Homework)
 * own convention exactly, confirmed via research: `computeRosterStatus` handles a null
 * submission explicitly rather than a pre-created "pending" row. `grade` is deliberately
 * numeric (`numeric(6,2)`, matching MarkEntity.score's own type) rather than the free-text
 * varchar LMS uses — a disclosed, deliberate departure from the literal template, made because
 * this story's own grade must flow directly into a Mark's numeric `score` with no translation. */
@Entity({ name: 'lab_report_submission' })
@Unique(['labReportAssignmentId', 'studentId'])
export class LabReportSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  labReportAssignmentId: string;

  @ManyToOne(() => LabReportAssignmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labReportAssignmentId' })
  labReportAssignment: LabReportAssignmentEntity;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => StudentEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'jsonb', default: [] })
  attachmentFileIds: string[];

  // Virtual — populated by LabReportSubmissionService after loading (not a DB column), mirrors
  // SubmissionEntity.attachments exactly.
  attachments?: { id: string; path: string }[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  submittedAt: Date;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  grade: string | null;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'uuid', nullable: true })
  gradedById: string | null;

  @ManyToOne(() => StaffEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'gradedById' })
  gradedBy: StaffEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  gradedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
