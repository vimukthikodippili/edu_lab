import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-PP-01 — FR-P5-PP-02. One window per teacher per PTM event — a teacher confirms a single
 * available time range for the day, not multiple disjoint ranges. Locked once the event is
 * published (slots are generated from this window at that moment). */
@Entity({ name: 'ptm_teacher_availability' })
@Unique(['ptmEventId', 'teacherId'])
export class PTMTeacherAvailabilityEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ptmEventId: string;

  @Column({ type: 'uuid' })
  teacherId: string;

  @Column({ type: 'varchar' })
  startTime: string;

  @Column({ type: 'varchar' })
  endTime: string;

  @CreateDateColumn()
  createdAt: Date;
}
