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
import { NotificationLogEntity } from './notification-log.entity';

@Entity({ name: 'emergency_alert' })
export class EmergencyAlertEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'uuid' })
  sentByStaffId: string;

  @ManyToOne(() => StaffEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sentByStaffId' })
  sentByStaff: StaffEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  sentAt: Date;

  @OneToMany(() => NotificationLogEntity, (l) => l.alert, { cascade: true })
  logs: NotificationLogEntity[];
}
