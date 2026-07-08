import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';

export enum TimetableEntryStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
}

@Entity({ name: 'timetable_entry' })
export class TimetableEntryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'smallint' })
  day: number; // 1=Mon, 2=Tue, ..., 6=Sat

  @Column({ type: 'smallint' })
  period: number; // 1..periodsPerDay

  @Column({ type: 'uuid' })
  teacherId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  roomNumber: string | null;

  @Column({ type: 'enum', enum: TimetableEntryStatus, default: TimetableEntryStatus.CONFIRMED })
  status: TimetableEntryStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  generatedAt: Date;

  @ManyToOne(() => ClassSectionEntity, { nullable: false, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classSectionId' })
  classSection: ClassSectionEntity;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacherId' })
  teacher: StaffEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;
}
