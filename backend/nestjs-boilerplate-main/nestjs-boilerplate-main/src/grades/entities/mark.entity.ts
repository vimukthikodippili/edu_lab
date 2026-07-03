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
import { StudentEntity } from '../../students/entities/student.entity';
import { AssessmentEntity } from './assessment.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

export enum MarkStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
}

@Index('UQ_mark_student_assessment', ['studentId', 'assessmentId'], {
  unique: true,
})
@Entity({ name: 'mark' })
export class MarkEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  assessmentId: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  score: string | null;

  @Column({ type: 'int' })
  maxScore: number;

  @Column({ type: 'enum', enum: MarkStatus, default: MarkStatus.DRAFT })
  status: MarkStatus;

  @Column({ type: 'uuid' })
  enteredByTeacherId: string;

  @ManyToOne(() => StudentEntity, {
    nullable: false,
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @ManyToOne(() => AssessmentEntity, {
    nullable: false,
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment: AssessmentEntity;

  @ManyToOne(() => StaffEntity, {
    nullable: false,
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'enteredByTeacherId' })
  enteredByTeacher: StaffEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
