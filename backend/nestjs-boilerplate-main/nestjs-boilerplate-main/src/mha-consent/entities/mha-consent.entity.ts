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

export enum MhaConsentMethod {
  IN_PERSON = 'in_person',
  WRITTEN = 'written',
  DIGITAL = 'digital',
}

/** FR-MHA-01 — guardian consent gate for MHA screening sessions. Deliberately a bare `studentId`
 * column with no relation to StudentEntity (this codebase's established pattern for
 * student-scoped sub-records, e.g. CounselorCaseEntity). Records are never deleted or edited in
 * place — `recordConsent()` always inserts a new row and, if one was active, marks it superseded
 * rather than overwriting it, so the consent history stays a permanent audit trail (AC #9). */
@Entity({ name: 'mha_consent' })
export class MhaConsentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid', nullable: true })
  guardianId: string | null;

  @ManyToOne(() => GuardianEntity, { nullable: true, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'guardianId' })
  guardian: GuardianEntity | null;

  // Snapshot at the time of consent — kept even if the linked Guardian record is later edited,
  // since a legal consent record must reflect who consented and how to reach them at that time.
  @Column({ type: 'varchar' })
  guardianName: string;

  @Column({ type: 'varchar' })
  guardianContact: string;

  @Column({ type: 'enum', enum: MhaConsentMethod, enumName: 'mha_consent_method' })
  method: MhaConsentMethod;

  @Column({ type: 'timestamptz' })
  consentedAt: Date;

  @Column({ type: 'uuid' })
  recordedByStaffId: string;

  @ManyToOne(() => StaffEntity, { nullable: false, onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'recordedByStaffId' })
  recordedBy: StaffEntity;

  @Column({ type: 'timestamptz', nullable: true })
  supersededAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  supersededByConsentId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
