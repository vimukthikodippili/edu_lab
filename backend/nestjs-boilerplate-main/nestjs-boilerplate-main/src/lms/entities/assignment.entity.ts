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

@Entity({ name: 'assignment' })
export class AssignmentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  instructions: string;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'jsonb', default: [] })
  attachmentFileIds: string[];

  // Virtual — populated by AssignmentsService after loading (not a DB column)
  attachments?: { id: string; path: string }[];

  @Column({ type: 'uuid' })
  createdByTeacherId: string;

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
