import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AssessmentEntity } from './assessment.entity';
import { SubjectTopicEntity } from '../../subject-topics/entities/subject-topic.entity';

/** The question format this topic is examined with on this particular assessment — deliberately
 * NOT a fixed property of SubjectTopicEntity itself, since the same topic (e.g. "Algebra") can be
 * MCQ on one test and Structured/Essay on another. */
export enum QuestionType {
  MCQ = 'mcq',
  STRUCTURED = 'structured',
  ESSAY = 'essay',
}

@Entity({ name: 'assessment_topic_allocation' })
@Unique(['assessmentId', 'subjectTopicId'])
export class AssessmentTopicAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assessmentId: string;

  @Column({ type: 'uuid' })
  subjectTopicId: string;

  @Column({ type: 'int' })
  maxMarks: number;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.STRUCTURED })
  questionType: QuestionType;

  @ManyToOne(() => AssessmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: AssessmentEntity;

  @ManyToOne(() => SubjectTopicEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectTopicId' })
  subjectTopic: SubjectTopicEntity;

  @CreateDateColumn()
  createdAt: Date;
}
