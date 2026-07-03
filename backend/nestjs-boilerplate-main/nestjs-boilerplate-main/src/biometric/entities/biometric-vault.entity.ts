import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { GuardianEntity } from '../../students/entities/guardian.entity';

export type TemplateType = 'fingerprint' | 'facial' | 'both';

@Entity({ name: 'biometric_vault' })
export class BiometricVaultEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  guardianId: string;

  @ManyToOne(() => GuardianEntity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'guardianId' })
  guardian: GuardianEntity;

  @Column({ type: 'varchar', length: 20 })
  templateType: TemplateType;

  // @Exclude() ensures these never leak via serialization even if accidentally returned
  @Exclude()
  @Column({ type: 'text' })
  ciphertext: string;

  @Exclude()
  @Column({ type: 'varchar', length: 24 })
  iv: string;

  @Exclude()
  @Column({ type: 'varchar', length: 32 })
  authTag: string;

  @Column({ type: 'timestamptz' })
  enrolledAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
