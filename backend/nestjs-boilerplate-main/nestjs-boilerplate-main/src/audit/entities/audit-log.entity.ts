import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export type AuditAction =
  | 'approve'
  | 'reject'
  | 'record_consent'
  | 'revoke_consent'
  | 'enroll'
  | 'manual_override';
export type AuditTargetType =
  | 'fee_waiver'
  | 'leave'
  | 'expense'
  | 'biometric_consent'
  | 'biometric_vault'
  | 'biometric_release_log';

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
