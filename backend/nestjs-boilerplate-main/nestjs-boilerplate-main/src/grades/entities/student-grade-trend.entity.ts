import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

@Entity({ name: 'student_grade_trend' })
@Unique(['studentId', 'subjectId'])
export class StudentGradeTrendEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'boolean', default: false })
  decliningTrend: boolean;

  @Column({ type: 'boolean', default: false })
  improvingTrend: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastComputedAt: Date | null;
}
