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
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { StudentEntity } from '../../students/entities/student.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { AcademicTermEntity } from './academic-term.entity';

@Unique('UQ_subject_result_student_subject_term', [
  'studentId',
  'subjectId',
  'termId',
])
@Entity({ name: 'subject_result' })
export class SubjectResultEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  termId: number;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  totalScore: string;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 })
  totalMaxScore: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  percentage: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  letterGrade: string | null;

  @Column({ type: 'int', nullable: true })
  subjectRank: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  subjectClassAveragePercentage: string | null;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @ManyToOne(() => StudentEntity, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @ManyToOne(() => SubjectEntity, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @ManyToOne(() => AcademicTermEntity, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'termId' })
  term: AcademicTermEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
