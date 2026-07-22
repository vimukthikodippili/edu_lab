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

export enum MatchType {
  FRIENDLY = 'friendly',
  INTER_SCHOOL = 'inter_school',
  TOURNAMENT = 'tournament',
  INTERNAL = 'internal',
}

/** NO_RESULT doubles as both a genuine outcome (abandoned/no result) and the default for a
 * fixture that's been logged but not yet played — FR-P3-MR-01 (create the record) and
 * FR-P3-MR-02 (enter the result) are two separate FRs, so a coach can log a match before
 * it happens and fill this in later via edit. */
export enum TeamResult {
  WIN = 'win',
  LOSS = 'loss',
  DRAW = 'draw',
  NO_RESULT = 'no_result',
}

@Entity({ name: 'match' })
export class MatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sportId: string;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sportId' })
  sport: SportEntity;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', nullable: true })
  opponent: string | null;

  @Column({ type: 'varchar' })
  venue: string;

  @Column({ type: 'enum', enum: MatchType })
  matchType: MatchType;

  @Column({ type: 'enum', enum: TeamResult, default: TeamResult.NO_RESULT })
  teamResult: TeamResult;

  @Column({ type: 'varchar', nullable: true })
  teamScore: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
