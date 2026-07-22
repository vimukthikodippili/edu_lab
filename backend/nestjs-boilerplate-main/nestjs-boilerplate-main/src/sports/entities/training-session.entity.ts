import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SportEntity } from './sport.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { StudentEntity } from '../../students/entities/student.entity';

/** A practice session — distinct from Match, which is for competitive events with an
 * opponent/team result. A training session has no opponent/score, only what happened,
 * who attended, and which enrolled student led it. Does not feed into performance
 * analysis snapshots — it carries no per-student metrics, only attendance/leadership. */
@Entity({ name: 'training_session' })
export class TrainingSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sportId: string;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sportId' })
  sport: SportEntity;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text' })
  description: string;

  /** Jsonb array of enrolled student ids — mirrors StaffEntity.qualificationDocIds's
   * established jsonb-array-of-ids convention. */
  @Column({ type: 'jsonb', default: [] })
  attendeeStudentIds: string[];

  @Column({ type: 'uuid', nullable: true })
  sessionLeaderStudentId: string | null;

  @ManyToOne(() => StudentEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'sessionLeaderStudentId' })
  sessionLeaderStudent: StudentEntity | null;

  @Column({ type: 'uuid' })
  loggedByStaffId: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'loggedByStaffId' })
  loggedByStaff: StaffEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
