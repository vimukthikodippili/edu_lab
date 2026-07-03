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

export enum LeaveType {
  ANNUAL = 'annual',
  MEDICAL = 'medical',
  CASUAL = 'casual',
  NO_PAY = 'no_pay',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'leave_request' })
export class LeaveRequestEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  staffId: string;

  @Column({ type: 'varchar', length: 20, enumName: 'leave_type' })
  leaveType: LeaveType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'varchar',
    length: 20,
    enumName: 'leave_status',
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({ type: 'uuid', nullable: true })
  decidedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;

  @ManyToOne(() => StaffEntity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'staffId' })
  staff: StaffEntity;

  @ManyToOne(() => StaffEntity, { nullable: true, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'decidedById' })
  decidedBy: StaffEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
