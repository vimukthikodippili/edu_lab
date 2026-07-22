import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SportTypeEntity } from './sport-type.entity';

/** Runtime-admin-managed via SportTypeController — a newly admin-added sport type (e.g. Karate)
 * would otherwise have zero metrics and be functionally useless (an empty performance-entry
 * grid, nothing for trend analysis to compute), so metric management is a necessary companion
 * to sport-type creation, not a separate deferred feature. Deploy-time seeded with the original
 * 13 types' fixed metrics (see sport-metric-seed.service.ts) as a starting point, editable
 * afterward. */
@Entity({ name: 'sport_metric' })
export class SportMetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sportTypeId: string;

  @ManyToOne(() => SportTypeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sportTypeId' })
  sportType: SportTypeEntity;

  @Column({ type: 'varchar' })
  metricName: string;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'boolean', default: false })
  isTimeBased: boolean;

  @Column({ type: 'boolean', default: false })
  isDistanceBased: boolean;

  @Column({ type: 'int' })
  ordering: number;
}
