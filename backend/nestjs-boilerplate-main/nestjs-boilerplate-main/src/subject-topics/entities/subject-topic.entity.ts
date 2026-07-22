import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'subject_topic' })
@Unique(['subjectId', 'teacherId', 'order'])
export class SubjectTopicEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'uuid' })
  teacherId: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'int' })
  order: number;

  /** Never hard-deleted — an archived topic must remain resolvable by id so any
   * historical record referencing it (e.g. a future per-topic mark allocation) never
   * dangles. Mirrors SubjectEntity.isActive's exact "flag, don't delete" convention. */
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
