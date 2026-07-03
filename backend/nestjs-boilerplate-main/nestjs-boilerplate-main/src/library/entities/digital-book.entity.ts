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
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

@Entity({ name: 'digital_book' })
export class DigitalBookEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  author: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subject: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid' })
  fileId: string;

  @Column({ type: 'int' })
  uploadedByUserId: number;

  @Column({ type: 'varchar', length: 255 })
  uploaderName: string;

  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @ManyToOne(() => FileEntity, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
