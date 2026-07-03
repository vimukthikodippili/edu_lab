import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { StaffEntity } from '../../staff/entities/staff.entity';

export enum ExpenseCategory {
  TRAVEL = 'travel',
  SUPPLIES = 'supplies',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

export enum ExpenseStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'expense_approval' })
export class ExpenseApprovalEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requestedById: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  category: ExpenseCategory;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ExpenseStatus.PENDING,
  })
  status: ExpenseStatus;

  @Column({ type: 'uuid', nullable: true })
  decidedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;

  @ManyToOne(() => StaffEntity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'requestedById' })
  requestedBy: StaffEntity;

  @ManyToOne(() => StaffEntity, { nullable: true, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'decidedById' })
  decidedBy: StaffEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
