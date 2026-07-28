import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-EV-02 — Event Attendance Tracking (Phase 5, Sprint 28). Bundles all three new tables in one
 * migration, mirroring `CreateEventTables.ts`'s "related tables land together" convention. No FK
 * constraints — matches this codebase's established bare-uuid-column convention for MHA/Event-
 * family child rows (services do their own manual joins). */
export class CreateEventAttendanceTables1793900000000 implements MigrationInterface {
  name = 'CreateEventAttendanceTables1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "event_student_attendance_method" AS ENUM ('qr_scan', 'class_teacher_bulk')
    `);

    await queryRunner.query(`
      CREATE TABLE "event_attendance" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventTicketId" uuid NOT NULL UNIQUE,
        "scannedAt" timestamptz NOT NULL,
        "scannedById" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "event_student_participant" (
        "id" uuid PRIMARY KEY,
        "eventId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "addedByStaffId" uuid NOT NULL,
        "qrCode" text NOT NULL,
        "issuedAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_event_student_participant_event_student" UNIQUE ("eventId", "studentId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_event_student_participant_event" ON "event_student_participant" ("eventId")
    `);

    await queryRunner.query(`
      CREATE TABLE "event_student_attendance" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventStudentParticipantId" uuid NOT NULL UNIQUE,
        "scannedAt" timestamptz NOT NULL,
        "scannedById" uuid NOT NULL,
        "method" event_student_attendance_method NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_student_attendance"`);
    await queryRunner.query(`DROP TABLE "event_student_participant"`);
    await queryRunner.query(`DROP TABLE "event_attendance"`);
    await queryRunner.query(`DROP TYPE "event_student_attendance_method"`);
  }
}
