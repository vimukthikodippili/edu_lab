import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { TargetedMessageEntity } from './targeted-message.entity';

export type TargetedRecipientType = 'parent' | 'teacher';
export type TargetedMessageChannel = 'sms' | 'email' | 'push';
export type TargetedDeliveryStatus = 'pending' | 'sent' | 'failed';

/** One row per (recipient, channel) pair — a disclosed necessary field beyond the literal model:
 * "SMS and Push selected → dispatched twice per recipient" and "a failed SMS delivery sets
 * deliveryStatus=failed for that row" only make sense if each row is scoped to a single channel,
 * otherwise a recipient with successful SMS and failed Push would have no way to record both
 * outcomes. Mirrors NotificationLogEntity's existing (recipientType, recipientId, recipientName,
 * channel, status) shape rather than inventing a new one. */
@Entity({ name: 'targeted_message_recipient' })
export class TargetedMessageRecipientEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  targetedMessageId: string;

  @ManyToOne(() => TargetedMessageEntity, (m) => m.recipients, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'targetedMessageId' })
  targetedMessage: TargetedMessageEntity;

  @Column({ type: 'varchar', length: 10 })
  recipientType: TargetedRecipientType;

  // No FK constraint — polymorphic across guardian/staff, same precedent as
  // NotificationLogEntity.recipientId.
  @Column({ type: 'uuid' })
  recipientId: string;

  @Column({ type: 'varchar', length: 200 })
  recipientName: string;

  @Column({ type: 'varchar', length: 10 })
  channel: TargetedMessageChannel;

  @Column({ type: 'varchar', length: 10, default: 'pending' })
  deliveryStatus: TargetedDeliveryStatus;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
