import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum EventStudentAttendanceMethod {
  QR_SCAN = 'qr_scan',
  CLASS_TEACHER_BULK = 'class_teacher_bulk',
}

/** P5-EV-02 — FR-P5-EV-16. Check-in record for a student participant, parallel to
 * `EventAttendanceEntity` but for the separate student-participation model. `method` distinguishes
 * an individual QR scan from a class-teacher's one-tap bulk mark — mirrors `ClassCheckInEntity`'s
 * own `method` enum precedent (`ClassCheckInMethod.QR_SCAN`). One row per participant —
 * `eventStudentParticipantId` is unique, making the class-teacher bulk action naturally idempotent. */
@Entity({ name: 'event_student_attendance' })
export class EventStudentAttendanceEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  eventStudentParticipantId: string;

  @Column({ type: 'timestamptz' })
  scannedAt: Date;

  @Column({ type: 'uuid' })
  scannedById: string;

  @Column({
    type: 'enum',
    enum: EventStudentAttendanceMethod,
    enumName: 'event_student_attendance_method',
  })
  method: EventStudentAttendanceMethod;

  @CreateDateColumn()
  createdAt: Date;
}
