import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum ConsentResponseType {
  SIGNED = 'signed',
  DECLINED = 'declined',
}

/** P5-PP-04 — FR-P5-PP-20/22/23. The permanent legal consent record itself (timestamp + guardian
 * identity + IP address) — deliberately not duplicated into a generic `audit_log` row, which has
 * no IP-address column. Unique on `(consentFormId, studentId)`, NOT `(..., guardianId)` — the
 * dashboard is per-*student*, so the first guardian to respond for a child is that child's
 * definitive record; a second guardian's attempt 409s. This also makes the record append-only
 * (no editing a signed consent) for free. */
@Entity({ name: 'consent_response' })
@Index(['consentFormId', 'studentId'], { unique: true })
export class ConsentResponseEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  consentFormId: string;

  @Column({ type: 'uuid' })
  guardianId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'enum', enum: ConsentResponseType, enumName: 'consent_response_type' })
  response: ConsentResponseType;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'timestamptz' })
  respondedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;
}
