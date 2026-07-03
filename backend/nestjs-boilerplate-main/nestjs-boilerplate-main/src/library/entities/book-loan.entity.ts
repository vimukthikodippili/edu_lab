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
import { BookEntity } from './book.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

export enum LoanStatus {
  ACTIVE = 'active',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
}

@Entity({ name: 'book_loan' })
export class BookLoanEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  bookId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  issuedByStaffId: string;

  @Column({ type: 'uuid', nullable: true })
  returnedByStaffId: string | null;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;

  @Column({ type: 'timestamptz' })
  dueAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  returnedAt: Date | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  fineAmount: string | null;

  @Column({ type: 'boolean', default: false })
  finePaid: boolean;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    enumName: 'loan_status',
    default: LoanStatus.ACTIVE,
  })
  status: LoanStatus;

  @ManyToOne(() => BookEntity, { nullable: false, eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' })
  book: BookEntity;

  @ManyToOne(() => StudentEntity, { nullable: false, eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'issuedByStaffId' })
  issuedByStaff: StaffEntity;

  @ManyToOne(() => StaffEntity, { nullable: true, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'returnedByStaffId' })
  returnedByStaff: StaffEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
