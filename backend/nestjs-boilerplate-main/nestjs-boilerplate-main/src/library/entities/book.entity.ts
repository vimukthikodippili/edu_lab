import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum BookStatus {
  AVAILABLE = 'available',
  DAMAGED = 'damaged',
  LOST = 'lost',
}

@Entity({ name: 'book' })
export class BookEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  isbn: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  barcode: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  author: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher: string | null;

  @Column({ type: 'int', nullable: true })
  publishYear: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subject: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gradeLevel: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'int', default: 1 })
  totalCopies: number;

  @Column({ type: 'int', default: 1 })
  availableCopies: number;

  @Column({
    type: 'enum',
    enum: BookStatus,
    enumName: 'book_status',
    default: BookStatus.AVAILABLE,
  })
  status: BookStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
