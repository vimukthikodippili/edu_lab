import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

@Entity({ name: 'teacher_performance_snapshot' })
@Unique(['staffId', 'weekStartDate'])
export class TeacherPerformanceSnapshotEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  staffId: string;

  @Column({ type: 'date' })
  weekStartDate: string;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'double precision' })
  syllabusCompletionPercent: number;

  @Column({ type: 'double precision' })
  plannedCompletionPercent: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
