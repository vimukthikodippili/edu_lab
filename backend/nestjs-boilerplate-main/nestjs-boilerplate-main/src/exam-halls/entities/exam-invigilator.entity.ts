import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EH-2 — FR-P5-EH-10. One row per staff member assigned to invigilate one hall for one exam.
 * Bare uuid FK columns, matching this module's established convention. Unique
 * `(examId, examHallId, staffId)` makes bulk (re-)assignment naturally idempotent. */
@Entity({ name: 'exam_invigilator' })
@Unique(['examId', 'examHallId', 'staffId'])
export class ExamInvigilatorEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  examId: string;

  @Column({ type: 'uuid' })
  examHallId: string;

  @Column({ type: 'uuid' })
  staffId: string;

  @CreateDateColumn()
  createdAt: Date;
}
