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
import { MarkEntity } from './mark.entity';
import { SubjectTopicEntity } from '../../subject-topics/entities/subject-topic.entity';

@Entity({ name: 'mark_topic_score' })
@Unique(['markId', 'subjectTopicId'])
export class MarkTopicScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  markId: string;

  @Column({ type: 'uuid' })
  subjectTopicId: string;

  @Column({ type: 'numeric', precision: 6, scale: 2 })
  score: string;

  @ManyToOne(() => MarkEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'markId' })
  mark: MarkEntity;

  @ManyToOne(() => SubjectTopicEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectTopicId' })
  subjectTopic: SubjectTopicEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
