import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DisorderSection {
  EDUCATIONAL_DISORDERS = 'educational_disorders',
  EMOTIONAL_MENTAL_HEALTH = 'emotional_mental_health',
  ADDICTION_ASSESSMENTS = 'addiction_assessments',
  SCHOOL_ACADEMIC_PROBLEMS = 'school_academic_problems',
  SOCIAL_PROBLEMS = 'social_problems',
  LIFESTYLE_ASSESSMENTS = 'lifestyle_assessments',
}

export enum RiskCategory {
  ACADEMIC_RISK = 'academic_risk',
  LEARNING_DISABILITY_RISK = 'learning_disability_risk',
  EMOTIONAL_RISK = 'emotional_risk',
  BEHAVIORAL_RISK = 'behavioral_risk',
  SOCIAL_RISK = 'social_risk',
  ADDICTION_RISK = 'addiction_risk',
  HEALTH_LIFESTYLE_RISK = 'health_lifestyle_risk',
}

/** Module 12 (MHA) Disorder/Test Registry — SRS Addendum §12.3. Configuration data driving the
 * intake form; deliberately soft-deactivate-only (see DisorderRegistryService) so historical
 * session records that reference a domain are never orphaned by a later admin edit. */
@Entity({ name: 'disorder_registry' })
export class DisorderRegistryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'enum', enum: DisorderSection, enumName: 'disorder_section' })
  section: DisorderSection;

  @Column({ type: 'enum', enum: RiskCategory, enumName: 'disorder_risk_category' })
  riskCategory: RiskCategory;

  @Column({ type: 'int' })
  ageMin: number;

  @Column({ type: 'int' })
  ageMax: number;

  @Column({ type: 'jsonb', default: [] })
  symptoms: string[];

  @Column({ type: 'jsonb', default: [] })
  tests: string[];

  @Column({ type: 'boolean', default: false })
  safetyFlag: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
