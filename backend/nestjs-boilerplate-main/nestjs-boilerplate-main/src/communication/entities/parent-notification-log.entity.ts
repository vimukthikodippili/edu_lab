import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum ParentNotificationChannel {
  SMS = 'sms',
  PUSH = 'push',
}

export enum ParentNotificationStatus {
  SENT = 'sent',
  FAILED = 'failed',
}

/** MHA-134 — FR-CM-05/AC #72. Communication-module audit trail for non-clinical guardian
 * notifications triggered from other modules. `source` names the originating feature (currently
 * always 'mha_session'); one row per (guardian, channel) delivery attempt. Deliberately a new
 * entity rather than reusing `NotificationLogEntity` — that one is hard-FK'd to
 * `EmergencyAlertEntity` and isn't a free-standing generic log. */
@Entity({ name: 'parent_notification_log' })
export class ParentNotificationLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  source: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  guardianId: string;

  @Column({ type: 'varchar', length: 200 })
  guardianName: string;

  @Column({
    type: 'enum',
    enum: ParentNotificationChannel,
    enumName: 'parent_notification_channel',
  })
  channel: ParentNotificationChannel;

  @Column({
    type: 'enum',
    enum: ParentNotificationStatus,
    enumName: 'parent_notification_status',
  })
  status: ParentNotificationStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
