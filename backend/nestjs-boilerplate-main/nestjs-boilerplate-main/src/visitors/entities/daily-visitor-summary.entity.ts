import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-VM-02 — FR-P5-VM-12. One row per date, written once daily by
 * `VisitorService.generateDailySummary()`. This is the audit anchor proving the automatic
 * compilation + Principal notification actually ran — the numbers themselves are always also
 * available live via `compileDailySummary()` for any date, so there's no risk of this table
 * drifting from the real log data it summarizes. */
@Entity({ name: 'daily_visitor_summary' })
export class DailyVisitorSummaryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ type: 'int' })
  totalVisitors: number;

  @Column({ type: 'jsonb' })
  byType: Record<string, number>;

  @Column({ type: 'numeric' })
  averageDurationMinutes: number;

  @Column({ type: 'int' })
  overstayCount: number;

  @CreateDateColumn()
  generatedAt: Date;
}
