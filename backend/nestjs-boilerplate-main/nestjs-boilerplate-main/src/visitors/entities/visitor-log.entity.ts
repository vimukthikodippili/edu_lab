import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-VM-01 — FR-P5-VM-01/06/09/11. One row per visit. Immutable append-only: after creation the
 * only permitted mutation is setting `signedOutAt`/`signedOutById` exactly once — no general
 * update/delete is exposed anywhere in the service. Bare uuid FK columns throughout, matching the
 * established Events/Exam-Hall "child row" convention (services do their own joins). */
@Entity({ name: 'visitor_log' })
export class VisitorLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  visitorId: string;

  @Column({ type: 'text' })
  purpose: string;

  @Column({ type: 'uuid' })
  hostStaffId: string;

  @Column({ type: 'timestamptz' })
  expectedDepartureTime: Date;

  @Column({ type: 'timestamptz' })
  signedInAt: Date;

  @Column({ type: 'uuid' })
  signedInById: string;

  @Column({ type: 'timestamptz', nullable: true })
  signedOutAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  signedOutById: string | null;

  @Column({ type: 'text', unique: true })
  badgeQrCode: string;

  @Column({ type: 'timestamptz' })
  qrCodeExpiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  overstayAlertedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  preRegistrationId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
