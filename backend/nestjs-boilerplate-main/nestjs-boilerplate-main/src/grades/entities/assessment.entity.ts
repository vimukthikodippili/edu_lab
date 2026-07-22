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
import { AcademicTermEntity } from './academic-term.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { AssessmentTopicAllocationEntity } from './assessment-topic-allocation.entity';

export enum AssessmentType {
  MONTHLY_TEST = 'monthly_test',
  TERM_TEST = 'term_test',
  MOCK = 'mock',
  OTHER = 'other',
}

@Entity({ name: 'assessment' })
export class AssessmentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  termId: number;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'enum', enum: AssessmentType })
  assessmentType: AssessmentType;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'int' })
  totalMarks: number;

  @Column({ type: 'uuid' })
  createdByTeacherId: string;

  @Column({ type: 'boolean', default: false })
  sectionHeadOverride: boolean;

  @Column({ type: 'uuid', nullable: true })
  overrideApprovedById: string | null;

  // Opts this assessment into the pre-submission materials-readiness gate (e.g. "does every
  // student have their full color set?") — general-purpose, not specific to any one subject.
  // Default false: every pre-existing assessment is completely unaffected.
  @Column({ type: 'boolean', default: false })
  requiresMaterialsCheck: boolean;

  // Free-text guidance shown to the marking teacher (e.g. rubric criteria) — deliberately not
  // a structured multi-criterion schema; marks stay a single flat score, as everywhere else.
  @Column({ type: 'text', nullable: true })
  instructions: string | null;

  // Virtual — populated by AssessmentService after loading (not a DB column), same convention
  // as AssignmentEntity.attachments. Not a real ORM relation, to avoid a circular eager-load
  // pair with AssessmentTopicAllocationEntity's own relation back to this entity.
  topicAllocations?: AssessmentTopicAllocationEntity[];

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @ManyToOne(() => AcademicTermEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'termId' })
  term: AcademicTermEntity;

  @ManyToOne(() => ClassSectionEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'classSectionId' })
  classSection: ClassSectionEntity;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdByTeacherId' })
  createdByTeacher: StaffEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
