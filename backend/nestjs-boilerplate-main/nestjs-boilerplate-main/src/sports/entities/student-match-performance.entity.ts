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
import { MatchEntity } from './match.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

export enum PerformanceStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
}

@Entity({ name: 'student_match_performance' })
@Unique(['matchId', 'studentId'])
export class StudentMatchPerformanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  matchId: string;

  @ManyToOne(() => MatchEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: MatchEntity;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => StudentEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  /** Sparse — only metrics the coach actually entered are present. Keyed by SportMetric.metricName. */
  @Column({ type: 'jsonb', default: {} })
  metricValues: Record<string, number>;

  /** Server-computed only, never accepted from the client — same discipline as
   * Assessment.totalMarks. Keyed by metricName; only time/distance/height-eligible metrics
   * on a personal-best-eligible sport ever appear here. */
  @Column({ type: 'jsonb', default: {} })
  personalBests: Record<string, boolean>;

  @Column({ type: 'enum', enum: PerformanceStatus, default: PerformanceStatus.DRAFT })
  status: PerformanceStatus;

  /** Set only the first time status becomes 'submitted' — never restarted by later edits, so
   * the 48-hour edit window counts from the original submission. */
  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /** A single-use grant an Admin/Principal sets on a specific locked record — consumed (reset
   * to false) by the next successful edit, not a permanent unlock. */
  @Column({ type: 'boolean', default: false })
  adminOverrideGranted: boolean;

  @Column({ type: 'uuid', nullable: true })
  adminOverrideGrantedByStaffId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  adminOverrideGrantedAt: Date | null;

  @Column({ type: 'uuid' })
  enteredByStaffId: string;

  @ManyToOne(() => StaffEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'enteredByStaffId' })
  enteredByStaff: StaffEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
