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
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

export enum RecordingStatus {
  NOT_STARTED = 'not_started',
  RECORDING = 'recording',
  PROCESSING = 'processing',
  AVAILABLE = 'available',
  FAILED = 'failed',
}

@Entity({ name: 'live_session' })
export class LiveSessionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'timestamp with time zone' })
  scheduledAt: Date;

  @Column({ type: 'int', default: 40 })
  durationMinutes: number;

  @Column({ type: 'varchar', nullable: true })
  joinUrl: string | null;

  @Column({ type: 'uuid' })
  createdByTeacherId: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  egressId: string | null;

  @Column({ type: 'varchar', nullable: true })
  recordingUrl: string | null;

  @Column({ type: 'enum', enum: RecordingStatus, default: RecordingStatus.NOT_STARTED })
  recordingStatus: RecordingStatus;

  @Column({ type: 'uuid', nullable: true })
  whiteboardSnapshotFileId: string | null;

  @Column({ type: 'uuid', nullable: true })
  whiteboardSnapshotPdfFileId: string | null;

  @ManyToOne(() => FileEntity, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'whiteboardSnapshotFileId' })
  whiteboardSnapshot: FileEntity | null;

  @ManyToOne(() => FileEntity, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'whiteboardSnapshotPdfFileId' })
  whiteboardSnapshotPdf: FileEntity | null;

  @ManyToOne(() => ClassSectionEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'classSectionId' })
  classSection: ClassSectionEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdByTeacherId' })
  createdByTeacher: StaffEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
