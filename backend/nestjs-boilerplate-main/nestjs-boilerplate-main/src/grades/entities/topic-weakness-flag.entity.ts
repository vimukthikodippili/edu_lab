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
import { SubjectTopicEntity } from '../../subject-topics/entities/subject-topic.entity';

/** Always upserted for both a weak AND a not-weak result (never removed when not-weak) —
 * unlike AcademicPatternFlagEntity's remove-when-not-flagged convention — so a future
 * consumer can show "weak in Algebra but strong in Geometry" per the SRS's own example. */
@Entity({ name: 'topic_weakness_flag' })
@Unique(['studentId', 'subjectTopicId'])
export class TopicWeaknessFlagEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  subjectTopicId: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'boolean' })
  isWeak: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  studentAverage: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  classAverage: string;

  @Column({ type: 'timestamptz' })
  computedAt: Date;

  @ManyToOne(() => SubjectTopicEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectTopicId' })
  subjectTopic: SubjectTopicEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
