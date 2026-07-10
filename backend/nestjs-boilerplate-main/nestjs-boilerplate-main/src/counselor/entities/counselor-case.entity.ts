import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum CounselorCaseTriggerType {
  BEHAVIORAL_OBSERVATIONS = 'behavioral_observations',
  LOW_MOOD_CHECKINS = 'low_mood_checkins',
}

export enum CounselorCaseStatus {
  OPEN = 'open',
  CLOSED = 'closed',
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

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedByStaffId: string | null;
}
