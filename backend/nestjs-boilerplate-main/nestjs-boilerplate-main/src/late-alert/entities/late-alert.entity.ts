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

@Entity({ name: 'late_alert' })
@Unique(['timetableEntryId', 'date'])
export class LateAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  timetableEntryId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int' })
  minutesLate: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedByStaffId: string | null;

  @ManyToOne(() => TimetableEntryEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timetableEntryId' })
  timetableEntry: TimetableEntryEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
