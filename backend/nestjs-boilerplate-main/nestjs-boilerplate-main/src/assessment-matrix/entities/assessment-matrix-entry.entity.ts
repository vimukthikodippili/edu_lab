import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { DisorderRegistryEntity } from '../../disorder-registry/entities/disorder-registry.entity';

export enum AssessmentMatrixAgeBand {
  BAND_5_8 = '5_8',
  BAND_9_12 = '9_12',
  BAND_13_15 = '13_15',
  BAND_16_19 = '16_19',
}

/** Module 12 (MHA) Recommended Assessment Matrix — SRS Addendum §12.4. Configurable, DB-backed
 * (AC #21) age-band guidance for 16 of the 21 disorder-registry domains. Read-only reference
 * data; no admin CRUD UI in this story — edits happen only via re-seeding. */
@Entity({ name: 'assessment_matrix_entry' })
export class AssessmentMatrixEntryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  domainId: string;

  @ManyToOne(() => DisorderRegistryEntity, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'domainId' })
  domain: DisorderRegistryEntity;

  @Column({ type: 'enum', enum: AssessmentMatrixAgeBand, enumName: 'assessment_matrix_age_band' })
  ageBand: AssessmentMatrixAgeBand;

  @Column({ type: 'boolean' })
  recommended: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
