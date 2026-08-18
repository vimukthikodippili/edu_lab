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
import { StudentEntity } from '../../students/entities/student.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { SubjectTopicEntity } from '../../subject-topics/entities/subject-topic.entity';
import { AcademicTermEntity } from './academic-term.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';

// The term-scoped counterpart TopicWeaknessFlagEntity never had: that entity's unique key is
// only (studentId, subjectTopicId), so its weekly cron overwrites the single existing row every
// run — last term's topic averages are gone the moment this term's are computed. This entity is
// keyed with termId included, exactly like SubjectResultEntity/TermResultEntity, so a genuine
// new row is created every term and full topic-level history survives across terms and years.
@Unique('UQ_topic_term_snapshot', ['studentId', 'subjectTopicId', 'termId'])
@Entity({ name: 'topic_term_snapshot' })
export class TopicTermSnapshotEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  subjectTopicId: string;

  @Column({ type: 'int' })
  termId: number;

  // The student's class section for this term, captured at computation time — lets a later
  // "did this teacher ever teach this student this subject" check work off already-stored
  // history instead of needing separate class-section-history tracking.
  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  studentAverage: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  classAverage: string;

  // Absolute threshold (studentAverage < 50) — deliberately different from
  // TopicWeaknessFlagEntity's relative (studentAverage < classAverage) formula.
  @Column({ type: 'boolean' })
  isWeak: boolean;

  @Column({ type: 'int' })
  assessmentCount: number;

  @Column({ type: 'timestamptz' })
  computedAt: Date;

  @ManyToOne(() => StudentEntity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @ManyToOne(() => SubjectTopicEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectTopicId' })
  subjectTopic: SubjectTopicEntity;

  @ManyToOne(() => AcademicTermEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'termId' })
  term: AcademicTermEntity;

  @ManyToOne(() => ClassSectionEntity, { nullable: false, eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'classSectionId' })
  classSection: ClassSectionEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
