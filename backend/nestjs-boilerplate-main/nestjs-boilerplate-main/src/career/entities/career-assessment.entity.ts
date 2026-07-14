import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  OceanScores,
  QuestionAnswer,
  RiasecScores,
  RiasecSuggestion,
} from '../career.types';

// One row per attempt (never upserted) — results are tracked as a trend across retakes (FR-CE-05),
// not overwritten. `userId` is the ONLY identity link, taken directly from the JWT — this entity
// deliberately has no relation to StudentEntity (or anything else), which is what makes it
// architecturally impossible for this module to read/write Stream or Subject enrollment data.
// See career-isolation.spec.ts.
@Entity({ name: 'career_assessment' })
export class CareerAssessmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  userId: number;

  // e.g. "2026" — set once at ocean/submit time. A student may only start one attempt per
  // academic year (FR-CE-05); retaking in a later year creates a new row, never mutates this one.
  @Column({ type: 'varchar' })
  academicYear: string;

  @Column({ type: 'jsonb', nullable: true })
  oceanAnswers: QuestionAnswer[] | null;

  @Column({ type: 'jsonb', nullable: true })
  oceanScores: OceanScores | null;

  @Column({ type: 'jsonb', nullable: true })
  riasecAnswers: QuestionAnswer[] | null;

  @Column({ type: 'jsonb', nullable: true })
  riasecScores: RiasecScores | null;

  @Column({ type: 'jsonb', nullable: true })
  riasecSuggestions: RiasecSuggestion[] | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
