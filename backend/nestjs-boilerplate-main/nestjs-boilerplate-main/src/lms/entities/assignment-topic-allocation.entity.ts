import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AssignmentEntity } from './assignment.entity';
import { SubjectTopicEntity } from '../../subject-topics/entities/subject-topic.entity';

@Entity({ name: 'assignment_topic_allocation' })
@Unique(['assignmentId', 'subjectTopicId'])
export class AssignmentTopicAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assignmentId: string;

  @Column({ type: 'uuid' })
  subjectTopicId: string;

  @Column({ type: 'int' })
  maxMarks: number;

  @ManyToOne(() => AssignmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: AssignmentEntity;

  @ManyToOne(() => SubjectTopicEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectTopicId' })
  subjectTopic: SubjectTopicEntity;

  @CreateDateColumn()
  createdAt: Date;
}
