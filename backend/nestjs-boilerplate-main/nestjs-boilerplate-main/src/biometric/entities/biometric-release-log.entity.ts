import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { GuardianEntity } from '../../students/entities/guardian.entity';

export type ReleaseResult = 'match' | 'no_match' | 'blacklisted';
export type VerificationMethod = 'biometric' | 'manual_override';

@Entity({ name: 'biometric_release_log' })
export class BiometricReleaseLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  guardianId: string;

  @ManyToOne(() => GuardianEntity, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'guardianId' })
  guardian: GuardianEntity;

  @Column({ type: 'text', default: '[]' })
  studentIds: string; // JSON-encoded string array of student UUIDs

  @Column({ type: 'varchar', length: 20 })
  result: ReleaseResult;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  confidence: number;

  @Column({ type: 'varchar', length: 20 })
  templateType: string;

  @Column({ type: 'int', default: 0 })
  teachersNotified: number;

  @Column({ type: 'int', default: 0 })
  alertsNotified: number;

  @Column({ type: 'varchar', length: 20, default: 'biometric' })
  verificationMethod: VerificationMethod;

  @Column({ type: 'timestamptz' })
  verifiedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
