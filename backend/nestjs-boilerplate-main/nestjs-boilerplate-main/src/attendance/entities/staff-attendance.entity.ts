import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum StaffAttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
}

@Entity({ name: 'staff_attendance' })
@Unique(['staffId', 'date'])
export class StaffAttendanceEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  staffId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: StaffAttendanceStatus })
  status: StaffAttendanceStatus;

  @Column({ type: 'uuid', nullable: true })
  markedById: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
