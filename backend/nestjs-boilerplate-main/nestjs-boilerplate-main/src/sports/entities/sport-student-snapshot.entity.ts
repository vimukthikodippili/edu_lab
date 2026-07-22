import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SportEntity } from './sport.entity';
import { StudentEntity } from '../../students/entities/student.entity';

export enum TrendFlag {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
}

export enum YearOnYearFlag {
  BETTER = 'better',
  WORSE = 'worse',
  SIMILAR = 'similar',
}

/** Append-only week-by-week history, NOT a point-in-time upserted-and-overwritten snapshot —
 * FR-P3-PA-01 is literally "week-by-week" trend history, so a new row is written every cron
 * run (one per (student, sport, metric, weekEnding)), never overwriting a prior week's row. */
@Entity({ name: 'sport_student_snapshot' })
@Unique(['studentId', 'sportId', 'metricName', 'weekEnding'])
export class SportStudentSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => StudentEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @Column({ type: 'uuid' })
  sportId: string;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sportId' })
  sport: SportEntity;

  @Column({ type: 'varchar' })
  metricName: string;

  @Column({ type: 'date' })
  weekEnding: Date;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  rollingAvg: number | null;

  @Column({ type: 'enum', enum: TrendFlag, default: TrendFlag.STABLE })
  trendFlag: TrendFlag;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  seasonAvg: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  personalBest: number | null;

  /** Genuinely absent (not zero) when no prior-year data exists for this (student, sport,
   * metric) — e.g. the sport's first tracked year. */
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  lastSeasonAvg: number | null;

  /** Deliberately nullable, unlike trendFlag's non-nullable default-to-STABLE — "no comparison
   * possible" (lastSeasonAvg is null) is a different fact than "similar performance." */
  @Column({ type: 'enum', enum: YearOnYearFlag, nullable: true })
  yearOnYearFlag: YearOnYearFlag | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
