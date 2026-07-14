import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { AssignmentEntity } from './assignment.entity';
import { StudentEntity } from '../../students/entities/student.entity';

@Index(['assignmentId', 'studentId'], { unique: true })
@Entity({ name: 'assignment_submission' })
export class SubmissionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assignmentId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'text', nullable: true })
  textContent: string | null;

  @Column({ type: 'jsonb', default: [] })
  attachmentFileIds: string[];

  // Virtual — populated by SubmissionsService after loading (not a DB column)
  attachments?: { id: string; path: string }[];

  @Column({ type: 'timestamp with time zone' })
  submittedAt: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  grade: string | null;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  gradedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  gradedByTeacherId: string | null;

  @ManyToOne(() => AssignmentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: AssignmentEntity;

  @ManyToOne(() => StudentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
