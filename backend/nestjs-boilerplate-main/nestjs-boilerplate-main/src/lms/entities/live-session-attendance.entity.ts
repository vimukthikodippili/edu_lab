import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { LiveSessionEntity } from './live-session.entity';
import { StudentEntity } from '../../students/entities/student.entity';

@Index(['liveSessionId', 'studentId'], { unique: true })
@Entity({ name: 'live_session_attendance' })
export class LiveSessionAttendanceEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  liveSessionId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'timestamp with time zone' })
  joinedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  leftAt: Date | null;

  @Column({ type: 'int', default: 0 })
  durationSeconds: number;

  @ManyToOne(() => LiveSessionEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'liveSessionId' })
  liveSession: LiveSessionEntity;

  @ManyToOne(() => StudentEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
