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
import { GuardianEntity } from '../../students/entities/guardian.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

@Entity({ name: 'biometric_consent' })
export class ConsentRecordEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  guardianId: string;

  @ManyToOne(() => GuardianEntity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'guardianId' })
  guardian: GuardianEntity;

  @Column({ type: 'timestamptz' })
  consentedAt: Date;

  @Column({ type: 'uuid' })
  consentedById: string;

  @ManyToOne(() => StaffEntity, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'consentedById' })
  consentedBy: StaffEntity;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  revokedById: string | null;

  @ManyToOne(() => StaffEntity, { nullable: true, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'revokedById' })
  revokedBy: StaffEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
