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
import { AcademicTermEntity } from './academic-term.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

@Unique('UQ_term_result_student_term', ['studentId', 'termId'])
@Entity({ name: 'term_result' })
export class TermResultEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'int' })
  termId: number;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'numeric', precision: 9, scale: 2, default: 0 })
  totalScore: string;

  @Column({ type: 'numeric', precision: 9, scale: 2, default: 0 })
  totalMaxScore: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  percentage: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  letterGrade: string | null;

  @Column({ type: 'int', nullable: true })
  rank: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  classAveragePercentage: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  percentile: string | null;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  reportCardFileId: string | null;

  @ManyToOne(() => FileEntity, {
    eager: false,
    nullable: true,
  })
  @JoinColumn({ name: 'reportCardFileId' })
  reportCardFile: FileEntity | null;

  @ManyToOne(() => StudentEntity, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

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
