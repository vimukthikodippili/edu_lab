import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

@Entity({ name: 'grading_band' })
export class GradingBandEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  minPercent: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  maxPercent: string;

  @Column({ type: 'varchar', length: 4 })
  letter: string;

  @Column({ type: 'int' })
  ordering: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
