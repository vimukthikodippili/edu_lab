import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { StaffEntity } from '../../staff/entities/staff.entity';

export enum AcademicYearStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity({ name: 'academic_year' })
export class AcademicYearEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 4, unique: true })
  year: string;

  @Column({ type: 'enum', enum: AcademicYearStatus, default: AcademicYearStatus.ACTIVE })
  status: AcademicYearStatus;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  endedById: string | null;

  @ManyToOne(() => StaffEntity, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'endedById' })
  endedBy: StaffEntity | null;

  @CreateDateColumn()
  createdAt: Date;
}
