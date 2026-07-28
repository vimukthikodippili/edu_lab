import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EV-02 — FR-P5-EV-13/14/15. Guardian-ticket check-in record, kept exactly to the AI prompt's
 * literal model shape. One attendance row per ticket — `eventTicketId` is unique, enforcing
 * duplicate-scan rejection at the schema level as well as in the service. Bare uuid columns, no
 * relations — matches this module's established convention (services do their own joins). */
@Entity({ name: 'event_attendance' })
export class EventAttendanceEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  eventTicketId: string;

  @Column({ type: 'timestamptz' })
  scannedAt: Date;

  @Column({ type: 'uuid' })
  scannedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
