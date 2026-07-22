import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

@Entity({ name: 'school_settings' })
export class SchoolSettingsEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', default: 10 })
  lateThresholdMinutes: number;

  /** FR-P3-AV-07: "Optional: school-wide public board" — off by default, an Admin/Principal
   * opts in via School Settings. */
  @Column({ type: 'boolean', default: false })
  isPublicSportsBoardEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
