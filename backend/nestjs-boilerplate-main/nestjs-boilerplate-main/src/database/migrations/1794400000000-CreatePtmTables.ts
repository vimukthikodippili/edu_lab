import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-PP-01 — Parent-Teacher Meeting Slot Booking (Phase 5). No FK constraints — matches the
 * established bare-uuid-column convention used throughout Events/Exam-Hall/Visitors (services do
 * their own joins). */
export class CreatePtmTables1794400000000 implements MigrationInterface {
  name = 'CreatePtmTables1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "ptm_event_status" AS ENUM ('draft', 'published')`);
    await queryRunner.query(`CREATE TYPE "ptm_slot_status" AS ENUM ('available', 'booked')`);
    await queryRunner.query(`CREATE TYPE "ptm_booking_status" AS ENUM ('confirmed', 'cancelled')`);

    await queryRunner.query(`
      CREATE TABLE "ptm_event" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "date" date NOT NULL,
        "slotDurationMinutes" int NOT NULL,
        "cancellationCutoffHours" int NOT NULL DEFAULT 24,
        "status" "ptm_event_status" NOT NULL DEFAULT 'draft',
        "createdByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ptm_teacher_availability" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ptmEventId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "startTime" varchar NOT NULL,
        "endTime" varchar NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ptm_teacher_availability_event_teacher" UNIQUE ("ptmEventId", "teacherId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ptm_slot" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ptmEventId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "slotStartTime" timestamptz NOT NULL,
        "slotEndTime" timestamptz NOT NULL,
        "status" "ptm_slot_status" NOT NULL DEFAULT 'available',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_ptm_slot_event_teacher" ON "ptm_slot" ("ptmEventId", "teacherId")`);

    await queryRunner.query(`
      CREATE TABLE "ptm_booking" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ptmSlotId" uuid NOT NULL,
        "guardianId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "bookedAt" timestamptz NOT NULL,
        "status" "ptm_booking_status" NOT NULL DEFAULT 'confirmed',
        "cancelledAt" timestamptz,
        "reminderSentAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_ptm_booking_slot" ON "ptm_booking" ("ptmSlotId")`);
    await queryRunner.query(`CREATE INDEX "IDX_ptm_booking_guardian" ON "ptm_booking" ("guardianId")`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ptm_booking"`);
    await queryRunner.query(`DROP TABLE "ptm_slot"`);
    await queryRunner.query(`DROP TABLE "ptm_teacher_availability"`);
    await queryRunner.query(`DROP TABLE "ptm_event"`);
    await queryRunner.query(`DROP TYPE "ptm_booking_status"`);
    await queryRunner.query(`DROP TYPE "ptm_slot_status"`);
    await queryRunner.query(`DROP TYPE "ptm_event_status"`);
  }
}
