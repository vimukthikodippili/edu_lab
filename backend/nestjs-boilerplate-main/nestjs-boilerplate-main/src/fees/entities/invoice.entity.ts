import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { StudentEntity } from '../../students/entities/student.entity';
import { AcademicTermEntity } from '../../grades/entities/academic-term.entity';

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

@Unique('UQ_invoice_student_term', ['studentId', 'termId'])
@Entity({ name: 'invoice' })
export class InvoiceEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'int' })
  termId: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: string;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    enumName: 'invoice_status',
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dueSoonReminderSentAt: Date | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  discountAmount: string;

  @ManyToOne(() => StudentEntity, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @ManyToOne(() => AcademicTermEntity, {
    nullable: false,
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'termId' })
  term: AcademicTermEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
