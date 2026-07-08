import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum AcademicPatternFlagType {
  ATTENDANCE_GRADE_CORRELATION = 'attendance_grade_correlation',
  EFFORT_OUTCOME_MISMATCH = 'effort_outcome_mismatch',
}

@Entity({ name: 'academic_pattern_flag' })
@Unique(['studentId', 'subjectId', 'type'])
export class AcademicPatternFlagEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'enum', enum: AcademicPatternFlagType })
  type: AcademicPatternFlagType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamp with time zone' })
  flaggedAt: Date;
}
