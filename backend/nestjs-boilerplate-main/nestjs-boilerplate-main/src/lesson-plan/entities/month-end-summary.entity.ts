import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export interface MonthEndIncompleteItem {
  title: string;
  plannedCompletionDate: string;
}

@Entity({ name: 'month_end_summary' })
@Unique(['staffId', 'subjectId', 'academicYear', 'month'])
export class MonthEndSummaryEntity extends EntityRelationalHelper {
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

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  plannedCount: number;

  @Column({ type: 'int' })
  completedCount: number;

  @Column({ type: 'jsonb', default: [] })
  incompleteItems: MonthEndIncompleteItem[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  generatedAt: Date;
}
