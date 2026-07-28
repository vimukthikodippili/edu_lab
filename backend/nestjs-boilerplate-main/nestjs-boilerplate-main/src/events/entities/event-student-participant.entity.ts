import { Column, CreateDateColumn, Entity, PrimaryColumn, Unique } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EV-02 — FR-P5-EV-16 (student participation, added beyond the AI prompt's literal guardian-
 * ticket scope). Represents "this student is expected to attend/participate in this event."
 * `qrCode`/`issuedAt` are folded directly onto this row rather than a separate ticket table —
 * unlike a guardian's ticket (conditional on capacity via a transactional register()), a
 * participant's QR is always issued immediately and unconditionally the moment they're added, so
 * it's a true 1:1 that doesn't need its own table (mirrors `StudentEntity.qrCode`'s own
 * "just a column" precedent). `id` is pre-generated (`crypto.randomUUID()`) before insert, exactly
 * like `EventTicketEntity.id`, so the QR image can encode this row's own id. Unique
 * `(eventId, studentId)` prevents adding the same student twice. */
@Entity({ name: 'event_student_participant' })
@Unique(['eventId', 'studentId'])
export class EventStudentParticipantEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  addedByStaffId: string;

  @Column({ type: 'text' })
  qrCode: string;

  @Column({ type: 'timestamptz' })
  issuedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
