import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SportEntity } from './sport.entity';
import { StudentEntity } from '../../students/entities/student.entity';

export enum CoachAlertType {
  DECLINING_TREND = 'declining_trend',
}

/** An append-only event log, not an upsert-and-clear live-status flag (unlike
 * AcademicPatternFlagEntity from the academic Student Analysis Engine) — matches the literal
 * "create a CoachAlert" wording, which reads as an event, not a status. */
@Entity({ name: 'coach_alert' })
export class CoachAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => StudentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @Column({ type: 'uuid' })
  sportId: string;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sportId' })
  sport: SportEntity;

  /** Which metric triggered this alert — not in the AI prompt's literal 3-field list, but a
   * declining-trend alert with no actionable detail isn't a usable alert. */
  @Column({ type: 'varchar' })
  metricName: string;

  @Column({ type: 'enum', enum: CoachAlertType })
  alertType: CoachAlertType;

  /** The 3 declining snapshots' rollingAvg, oldest→newest — "the last 3 values showing the
   * decline" (the AI prompt's own words) captured as a real fact at creation time, not
   * reconstructed later from snapshots that may have since moved past the 3-week window. Not in
   * the AI prompt's literal field list, same disclosed-addition reasoning as metricName above. */
  @Column({ type: 'jsonb' })
  declineValues: number[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledgedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedByStaffId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
