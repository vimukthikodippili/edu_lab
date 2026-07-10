import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TimetableEntryEntity } from '../../timetable/entities/timetable-entry.entity';

export enum ClassCheckInMethod {
  PWA_TAP = 'pwa_tap',
  QR_SCAN = 'qr_scan',
  LIVE_SESSION_AUTO = 'live_session_auto',
}

@Entity({ name: 'class_check_in' })
@Unique(['timetableEntryId', 'date'])
export class ClassCheckInEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  timetableEntryId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'uuid' })
  teacherId: string;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  checkedInAt: Date;

  @Column({
    type: 'enum',
    enum: ClassCheckInMethod,
    default: ClassCheckInMethod.PWA_TAP,
  })
  method: ClassCheckInMethod;

  @ManyToOne(() => TimetableEntryEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timetableEntryId' })
  timetableEntry: TimetableEntryEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
