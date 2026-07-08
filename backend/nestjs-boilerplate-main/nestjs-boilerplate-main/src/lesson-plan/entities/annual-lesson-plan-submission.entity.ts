import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'annual_lesson_plan_submission' })
@Unique(['staffId', 'subjectId', 'gradeId', 'academicYear'])
export class AnnualLessonPlanSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  staffId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  gradeId: number;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'boolean', default: false })
  isSubmitted: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
