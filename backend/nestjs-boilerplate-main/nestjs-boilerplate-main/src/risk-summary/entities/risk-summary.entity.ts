import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { RiskCategory } from '../../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';

/** MHA-124 — FR-MHA-19/20/21/26. One row per RiskCategory per completed session (7 rows),
 * persisted once at completion by RiskAggregationService. `sessionId` is a bare column (no
 * relation), matching this MHA family's established pattern for child rows of `mha_session`
 * (mirrors `domain_result`'s own FK style, but this entity has no need to join back — it's
 * always read scoped to one sessionId). `level` is the max-severity rollup among assessed
 * domains in that category, or `NOT_ASSESSED` if none were assessed (never silently `NONE`). */
@Entity({ name: 'risk_summary' })
@Index('UQ_risk_summary_session_category', ['sessionId', 'riskCategory'], { unique: true })
export class RiskSummaryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'enum', enum: RiskCategory, enumName: 'disorder_risk_category' })
  riskCategory: RiskCategory;

  @Column({ type: 'enum', enum: DomainResultLevel, enumName: 'domain_result_level' })
  level: DomainResultLevel;

  @CreateDateColumn()
  createdAt: Date;
}
