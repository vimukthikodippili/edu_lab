import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

export enum StudentDocumentType {
  CHARACTER_CERTIFICATE = 'character_certificate',
  LEAVING_REPORT = 'leaving_report',
}

@Entity({ name: 'student_document' })
export class StudentDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'enum', enum: StudentDocumentType })
  type: StudentDocumentType;

  @Column({ type: 'uuid' })
  fileId: string;

  // Links to UserEntity.id, a plain numeric auto-increment PK in this codebase — not a uuid.
  @Column({ type: 'int', nullable: true })
  issuedByUserId: number | null;

  @ManyToOne(() => FileEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
