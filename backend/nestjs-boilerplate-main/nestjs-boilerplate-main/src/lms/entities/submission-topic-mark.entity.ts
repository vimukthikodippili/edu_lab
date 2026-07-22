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
import { SubmissionEntity } from './submission.entity';
import { SubjectTopicEntity } from '../../subject-topics/entities/subject-topic.entity';

@Entity({ name: 'submission_topic_mark' })
@Unique(['submissionId', 'subjectTopicId'])
export class SubmissionTopicMarkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  submissionId: string;

  @Column({ type: 'uuid' })
  subjectTopicId: string;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  score: string;

  @ManyToOne(() => SubmissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission: SubmissionEntity;

  @ManyToOne(() => SubjectTopicEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectTopicId' })
  subjectTopic: SubjectTopicEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
