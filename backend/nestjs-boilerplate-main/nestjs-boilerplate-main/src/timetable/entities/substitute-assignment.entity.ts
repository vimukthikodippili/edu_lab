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
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';

export enum SubstituteStatus {
  SUGGESTED = 'suggested',
  ASSIGNED  = 'assigned',
  NO_COVER  = 'no_cover',
}

@Entity({ name: 'substitute_assignment' })
export class SubstituteAssignmentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  leaveRequestId: string;

  @Column({ type: 'uuid' })
  absentTeacherId: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'smallint' })
  day: number; // 1=Mon … 6=Sat (matches TimetableEntry.day)

  @Column({ type: 'smallint' })
  period: number; // 1-based

  @Column({ type: 'uuid', nullable: true })
  suggestedSubstituteId: string | null;

  @Column({ type: 'uuid', nullable: true })
  assignedSubstituteId: string | null;

  @Column({ type: 'varchar', length: 20, default: SubstituteStatus.SUGGESTED })
  status: SubstituteStatus;

  @Column({ type: 'uuid', nullable: true })
  assignedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'absentTeacherId' })
  absentTeacher: StaffEntity;

  @ManyToOne(() => StaffEntity, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'suggestedSubstituteId' })
  suggestedSubstitute: StaffEntity | null;

  @ManyToOne(() => StaffEntity, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedSubstituteId' })
  assignedSubstitute: StaffEntity | null;

  @ManyToOne(() => ClassSectionEntity, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'classSectionId' })
  classSection: ClassSectionEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
