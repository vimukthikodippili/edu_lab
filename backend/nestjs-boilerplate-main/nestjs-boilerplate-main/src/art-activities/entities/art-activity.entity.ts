import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

// One row per painting/art session held for a class section — the class-teacher-facing
// before/after color check (ArtActivityStudentCheckEntity) hangs off this, kept separate
// from AssessmentEntity since this isn't a graded instrument.
@Entity({ name: 'art_activity' })
export class ArtActivityEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'date' })
  activityDate: string;

  @Column({ type: 'varchar', length: 150, default: 'Painting Activity' })
  title: string;

  @Column({ type: 'uuid' })
  createdByStaffId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
