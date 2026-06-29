import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

@Entity({ name: 'timetable_record' })
export class TimetableRecordEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 4, unique: true })
  academicYear: string;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  finalizedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  finalizedBy: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
