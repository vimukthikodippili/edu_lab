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
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { GradeEntity } from '../../students/entities/grade.entity';

@Entity({ name: 'syllabus_unit' })
@Unique(['subjectId', 'gradeId', 'academicYear', 'order'])
export class SyllabusUnitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  gradeId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'smallint' })
  order: number;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @ManyToOne(() => SubjectEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @ManyToOne(() => GradeEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'gradeId' })
  grade: GradeEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
