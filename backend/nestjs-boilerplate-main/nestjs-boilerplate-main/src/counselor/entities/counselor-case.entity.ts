import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum CounselorCaseTriggerType {
  BEHAVIORAL_OBSERVATIONS = 'behavioral_observations',
  LOW_MOOD_CHECKINS = 'low_mood_checkins',
  MHA_SAFETY_FLAG = 'mha_safety_flag',
}

export enum CounselorCaseStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

/** MHA-133 — AC #4. Kept independent of `status` deliberately: a case can be urgent and still
 * open, or urgent and later closed after review — the two dimensions aren't mutually exclusive,
 * so "urgent" is not a third status value. */
export enum CounselorCasePriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
}

@Entity({ name: 'counselor_case' })
export class CounselorCaseEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'enum', enum: CounselorCaseTriggerType })
  triggerType: CounselorCaseTriggerType;

  // A fixed, non-clinical plain-language template — never names a condition. See
  // buildCaseTriggerSummary() in counselor-case.service.ts and its content-safety test.
  @Column({ type: 'text' })
  triggerSummary: string;

  @Column({ type: 'enum', enum: CounselorCaseStatus, default: CounselorCaseStatus.OPEN })
  status: CounselorCaseStatus;

  @Column({
    type: 'enum',
    enum: CounselorCasePriority,
    default: CounselorCasePriority.ROUTINE,
  })
  priority: CounselorCasePriority;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedByStaffId: string | null;
}
