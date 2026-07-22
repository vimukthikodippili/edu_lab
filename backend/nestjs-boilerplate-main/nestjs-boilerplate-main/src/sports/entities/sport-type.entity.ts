import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Replaces the old hardcoded `SportType` enum — an Admin/Principal can now add a new sport
 * type (e.g. Karate) at runtime instead of it requiring a code change + migration. Deploy-time
 * seeded with the 13 original types (see sport-type-seed.service.ts), but the table itself is
 * fully runtime-writable via SportTypeController. */
@Entity({ name: 'sport_type' })
export class SportTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  /** Replaces the old hardcoded PERSONAL_BEST_ELIGIBLE_SPORTS Set in performance.service.ts —
   * FR-P3-MR-07 ("For time/distance/height sports") is now a per-type data flag, so a newly
   * admin-added type can opt in without a code change. Defaults false: a brand-new type (e.g.
   * Karate) has no obvious "personal best" concept until an admin explicitly enables it. */
  @Column({ type: 'boolean', default: false })
  isPersonalBestEligible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
