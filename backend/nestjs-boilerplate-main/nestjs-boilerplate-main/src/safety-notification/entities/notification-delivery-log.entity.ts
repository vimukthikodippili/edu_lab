import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum DeliveryChannel {
  SMS = 'sms',
  PUSH = 'push',
}

export enum DeliveryStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

/** MHA-133 — AC #2/#3. One row per (recipient, channel) delivery attempt for a safety-flag
 * escalation. Rows sharing an `alertId` belong to the same `escalate()` call. Bare FKs
 * (sessionId/studentId/recipientStaffId), matching this module family's established pattern. */
@Entity({ name: 'notification_delivery_log' })
export class NotificationDeliveryLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  alertId: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  recipientStaffId: string;

  @Column({ type: 'enum', enum: DeliveryChannel, enumName: 'delivery_channel' })
  channel: DeliveryChannel;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    enumName: 'delivery_status',
    default: DeliveryStatus.QUEUED,
  })
  status: DeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
