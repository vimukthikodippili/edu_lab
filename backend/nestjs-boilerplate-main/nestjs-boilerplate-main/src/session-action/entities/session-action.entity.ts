import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum SessionActionStatus {
  OPEN = 'open',
  COMPLETE = 'complete',
}

/** MHA-124/131 — FR-MHA-23/24/26/32. One row per recommended-action string, persisted once at
 * session completion by RecommendedActionService. `sortOrder` preserves display order (safety
 * escalation always first, per FR-MHA-23). `status` (MHA-131) lets the counselor track each
 * action as open/complete after the fact — independent of session completion itself. */
@Entity({ name: 'session_action' })
export class SessionActionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'text' })
  actionText: string;

  @Column({ type: 'int' })
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: SessionActionStatus,
    enumName: 'session_action_status',
    default: SessionActionStatus.OPEN,
  })
  status: SessionActionStatus;

  /** MHA-142 — FR-MHA-32/AC #84-87. Set together, atomically, only on the open->complete
   * transition (RecommendedActionService.updateStatus) — never independently editable, and never
   * cleared once set: a completed action is immutable (see the 422 guard in that method).
   * `completedByStaffId` is a bare Staff UUID, matching this module family's established
   * actor-id convention (mha_session.counselorStaffId, counselor_case.closedByStaffId) — not a
   * raw User id. */
  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  completedByStaffId: string | null;

  @Column({ type: 'text', nullable: true })
  completionNote: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
