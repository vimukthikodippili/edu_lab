import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { EmergencyAlertEntity } from './emergency-alert.entity';

export type RecipientType = 'guardian' | 'staff';
export type NotificationChannel = 'sms' | 'push' | 'email';
export type DeliveryStatus = 'sent' | 'failed';

@Entity({ name: 'notification_log' })
export class NotificationLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  alertId: string;

  @ManyToOne(() => EmergencyAlertEntity, (a) => a.logs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'alertId' })
  alert: EmergencyAlertEntity;

  @Column({ type: 'varchar', length: 10 })
  recipientType: RecipientType;

  @Column({ type: 'uuid' })
  recipientId: string;

  @Column({ type: 'varchar', length: 200 })
  recipientName: string;

  @Column({ type: 'varchar', length: 10 })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 10 })
  status: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
