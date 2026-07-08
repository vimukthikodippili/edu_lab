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
import { SyllabusUnitEntity } from '../../syllabus/entities/syllabus-unit.entity';

@Entity({ name: 'annual_lesson_plan_entry' })
@Unique(['staffId', 'syllabusUnitId'])
export class AnnualLessonPlanEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  staffId: string;

  @Column({ type: 'uuid' })
  syllabusUnitId: string;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'date' })
  plannedCompletionDate: string;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @Column({ type: 'date', nullable: true })
  actualCompletionDate: string | null;

  @ManyToOne(() => SyllabusUnitEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'syllabusUnitId' })
  syllabusUnit: SyllabusUnitEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
