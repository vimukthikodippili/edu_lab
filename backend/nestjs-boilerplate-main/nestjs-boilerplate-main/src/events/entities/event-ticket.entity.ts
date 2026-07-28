import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EV-01 — FR-P5-EV-08. `id` is pre-generated (`crypto.randomUUID()`) before insert so the QR
 * image can encode it in the same transaction, matching `StudentEntity.qrCode`'s exact precedent
 * (a real base64 PNG data-URI via the `qrcode` package, encoding a business identifier the
 * eventual scanner looks up — not a signed/encrypted payload; scanning itself is a later,
 * deferred story). One ticket per confirmed registration — `eventRegistrationId` is unique. */
@Entity({ name: 'event_ticket' })
export class EventTicketEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid', unique: true })
  eventRegistrationId: string;

  @Column({ type: 'text' })
  qrCode: string;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;
}
