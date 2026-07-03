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
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { AcademicTermEntity } from './academic-term.entity';

@Entity({ name: 'term_assessment_plan' })
@Unique(['subjectId', 'termId'])
export class TermAssessmentPlanEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  termId: number;

  @Column({ type: 'int' })
  requiredAssessmentCount: number;

  @Column({ type: 'uuid' })
  setBySectionHeadId: string;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @ManyToOne(() => AcademicTermEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'termId' })
  term: AcademicTermEntity;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'setBySectionHeadId' })
  setSectionHead: StaffEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
