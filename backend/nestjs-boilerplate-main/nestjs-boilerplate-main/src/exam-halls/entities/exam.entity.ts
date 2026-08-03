import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum ExamType {
  TERM_TEST = 'term_test',
  MONTHLY_TEST = 'monthly_test',
  SCHOLARSHIP = 'scholarship',
  O_LEVEL = 'o_level',
  A_LEVEL = 'a_level',
  MOCK_OL = 'mock_ol',
  MOCK_AL = 'mock_al',
  OTHER = 'other',
}

/** P5-EH — FR-P5-EH-01/04. Phase 1's "Grades & Exams" module never actually produced a literal
 * `Exam` entity — only `AssessmentEntity` (src/grades/entities/assessment.entity.ts), which is
 * mandatorily scoped to exactly one classSectionId and has no time/venue field. Sri Lankan
 * national-style exams (O/L, A/L, Scholarship) are sat by a whole grade cohort across many class
 * sections in dedicated halls — a structurally different concept, so this is a fresh, standalone
 * entity rather than a retrofit of `assessment`. Bare uuid/int FK columns, no relations — matches
 * the established Events/MHA "child row of a parent" convention (services do their own joins). */
@Entity({ name: 'exam' })
export class ExamEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: ExamType, enumName: 'exam_type' })
  examType: ExamType;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  gradeId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar' })
  startTime: string;

  @Column({ type: 'varchar' })
  endTime: string;

  @Column({ type: 'varchar' })
  academicYear: string;

  @Column({ type: 'uuid' })
  createdByStaffId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
