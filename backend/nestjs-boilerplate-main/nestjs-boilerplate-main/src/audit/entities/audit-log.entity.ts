import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export type AuditAction =
  | 'approve'
  | 'reject'
  | 'record_consent'
  | 'revoke_consent'
  | 'enroll'
  | 'manual_override'
  | 'create_session'
  | 'update_domain'
  | 'raise_safety_flag'
  | 'complete_session'
  | 'abandon_session'
  | 'generate_summary'
  | 'update_action'
  | 'notify_guardian'
  | 'complete_action'
  | 'create_event'
  | 'publish_event'
  | 'cancel_event'
  | 'add_participants'
  | 'allocate_seats'
  | 'assign_invigilator'
  | 'visitor_sign_in'
  | 'visitor_sign_out'
  | 'visitor_blocked'
  | 'visitor_block'
  | 'ptm_book'
  | 'ptm_cancel'
  | 'feedback_review'
  | 'feedback_respond'
  | 'create_consent'
  | 'remind_consent';
export type AuditTargetType =
  | 'fee_waiver'
  | 'leave'
  | 'expense'
  | 'biometric_consent'
  | 'biometric_vault'
  | 'biometric_release_log'
  | 'mha_consent'
  | 'mha_session'
  | 'domain_result'
  | 'session_action'
  | 'event'
  | 'exam'
  | 'visitor'
  | 'ptm_booking'
  | 'parent_feedback'
  | 'consent_form';

@Entity({ name: 'audit_log' })
export class AuditLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actorId: string;

  @Column({ type: 'varchar', length: 20 })
  action: AuditAction;

  @Column({ type: 'varchar', length: 20 })
  targetType: AuditTargetType;

  @Column({ type: 'uuid' })
  targetId: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
