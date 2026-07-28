import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { MhaSessionEntity } from '../../mha-session/entities/mha-session.entity';
import { DisorderRegistryEntity } from '../../disorder-registry/entities/disorder-registry.entity';

export enum DomainResultLevel {
  NOT_ASSESSED = 'not_assessed',
  NONE = 'none',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  SEVERE = 'severe',
}

/** MHA-120 — FR-MHA-08/09/10/11/12. One row per domain per session, pre-created as
 * 'not_assessed' when the session is created (see MhaSessionService.createSession). `level` only
 * ever changes via an explicit PATCH that includes it — never derived from `checkedSymptoms` or
 * any other data (EXCL-01, AC #27). `safetyFlagRaised` exists for forward schema compatibility
 * only; the safety-flag checkbox/escalation UI (FR-MHA-14 to -18) is a later story's scope.
 * MHA-121 — counselor notes are AES-256-GCM encrypted at the application layer before persistence
 * (DomainResultNoteCryptoService, its own dedicated key isolated from CounselorNoteCryptoService's).
 * `counselorNotesCiphertext`/`Iv`/`AuthTag` replace the plaintext column; `@Exclude()` is
 * defense-in-depth so they never leak via serialization even if accidentally returned raw. */
@Entity({ name: 'domain_result' })
@Index('UQ_domain_result_session_domain', ['sessionId', 'domainId'], { unique: true })
export class DomainResultEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => MhaSessionEntity, { nullable: false, onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'sessionId' })
  session: MhaSessionEntity;

  @Column({ type: 'uuid' })
  domainId: string;

  @ManyToOne(() => DisorderRegistryEntity, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'domainId' })
  domain: DisorderRegistryEntity;

  @Column({ type: 'enum', enum: DomainResultLevel, enumName: 'domain_result_level', default: DomainResultLevel.NOT_ASSESSED })
  level: DomainResultLevel;

  @Column({ type: 'jsonb', default: [] })
  checkedSymptoms: string[];

  @Exclude()
  @Column({ type: 'text', nullable: true })
  counselorNotesCiphertext: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 24, nullable: true })
  counselorNotesIv: string | null;

  @Exclude()
  @Column({ type: 'varchar', length: 32, nullable: true })
  counselorNotesAuthTag: string | null;

  @Column({ type: 'boolean', default: false })
  safetyFlagRaised: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  assessedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
