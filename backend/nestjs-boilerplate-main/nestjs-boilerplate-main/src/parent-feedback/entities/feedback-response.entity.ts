import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-PP-03 — FR-P5-PP-15. One response per resolution — `respond()` is one-shot (409 if the
 * parent `ParentFeedback` is already RESOLVED), so there is at most one row per feedback item. */
@Entity({ name: 'feedback_response' })
export class FeedbackResponseEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  parentFeedbackId: string;

  @Column({ type: 'uuid' })
  respondedById: string;

  @Column({ type: 'text' })
  responseBody: string;

  @Column({ type: 'timestamptz' })
  respondedAt: Date;
}
