import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RiskCategory } from '../../disorder-registry/entities/disorder-registry.entity';
import { DomainResultLevel } from '../../domain-result/entities/domain-result.entity';

/** MHA-131 — FR-MHA-23/24/37. Admin-configurable rule set driving RecommendedActionService.
 * `riskCategory: null` means "any category" — used by the Monthly Follow-up catch-all rule, since
 * that one default rule (AC #54) doesn't target a single category the way the other 5 do. Like
 * disorder-registry, deliberately soft-deactivate-only via `isActive` — no delete() — so a rule
 * referenced by a historical session's already-generated SessionAction text is never orphaned by
 * a later admin edit (the generated text is a persisted copy, not a live reference). */
@Entity({ name: 'action_rule' })
export class ActionRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: RiskCategory, enumName: 'disorder_risk_category', nullable: true })
  riskCategory: RiskCategory | null;

  @Column({ type: 'enum', enum: DomainResultLevel, enumName: 'domain_result_level' })
  minimumLevel: DomainResultLevel;

  @Column({ type: 'text' })
  actionText: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int' })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
