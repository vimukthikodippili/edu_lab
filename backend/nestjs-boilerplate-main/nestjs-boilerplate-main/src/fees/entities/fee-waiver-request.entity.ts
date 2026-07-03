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
import { StudentEntity } from '../../students/entities/student.entity';
import { InvoiceEntity } from './invoice.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

export enum FeeWaiverStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ name: 'fee_waiver_request' })
export class FeeWaiverRequestEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  requestedDiscountAmount: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: FeeWaiverStatus,
    enumName: 'fee_waiver_status',
    default: FeeWaiverStatus.PENDING,
  })
  status: FeeWaiverStatus;

  @Column({ type: 'uuid' })
  requestedById: string;

  @Column({ type: 'uuid', nullable: true })
  decidedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  decisionNote: string | null;

  @ManyToOne(() => StudentEntity, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @ManyToOne(() => InvoiceEntity, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: InvoiceEntity;

  @ManyToOne(() => StaffEntity, {
    nullable: false,
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'requestedById' })
  requestedBy: StaffEntity;

  @ManyToOne(() => StaffEntity, {
    nullable: true,
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'decidedById' })
  decidedBy: StaffEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
