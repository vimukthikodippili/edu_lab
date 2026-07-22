import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { TargetedMessageRecipientEntity } from './targeted-message-recipient.entity';

@Entity({ name: 'targeted_message' })
export class TargetedMessageEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sentByStaffId: string;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sentByStaffId' })
  sentByStaff: StaffEntity;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'boolean', default: false })
  channelSms: boolean;

  @Column({ type: 'boolean', default: false })
  channelEmail: boolean;

  @Column({ type: 'boolean', default: false })
  channelPush: boolean;

  @Column({ type: 'int' })
  recipientCount: number;

  @CreateDateColumn({ type: 'timestamptz' })
  sentAt: Date;

  @OneToMany(() => TargetedMessageRecipientEntity, (r) => r.targetedMessage, { cascade: true })
  recipients: TargetedMessageRecipientEntity[];
}
