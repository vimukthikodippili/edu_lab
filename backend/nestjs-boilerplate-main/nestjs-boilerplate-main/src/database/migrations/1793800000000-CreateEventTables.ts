import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-EV-01 — School Events & Calendar Management (Phase 5, Sprint 28). Bundles all three new
 * tables in one migration, mirroring `AddSessionSummaryTables.ts`'s "related tables land together"
 * convention. No FK constraints between the three tables — matches this codebase's established
 * bare-uuid-column convention for MHA-family child rows, applied here for the same reason
 * (services do their own manual joins; simpler cross-module reuse). */
export class CreateEventTables1793800000000 implements MigrationInterface {
  name = 'CreateEventTables1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "event_type" AS ENUM (
        'sports_day', 'prize_giving', 'cultural', 'parent_evening', 'open_day', 'other'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "event_status" AS ENUM ('draft', 'published', 'cancelled')
    `);
    await queryRunner.query(`
      CREATE TYPE "event_registration_status" AS ENUM ('registered', 'waitlisted', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "event" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "eventType" event_type NOT NULL,
        "date" date NOT NULL,
        "startTime" varchar NOT NULL,
        "endTime" varchar NOT NULL,
        "venue" varchar NOT NULL,
        "description" text,
        "capacity" int NOT NULL,
        "ticketsPerFamily" int NOT NULL,
        "status" event_status NOT NULL DEFAULT 'draft',
        "createdByStaffId" uuid NOT NULL,
        "publishedAt" timestamptz,
        "cancelledAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "event_registration" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "guardianId" uuid NOT NULL,
        "studentId" uuid,
        "status" event_registration_status NOT NULL,
        "registeredAt" timestamptz NOT NULL,
        "waitlistedAt" timestamptz,
        "cancelledAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_event_registration_event" ON "event_registration" ("eventId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_event_registration_guardian_event" ON "event_registration" ("guardianId", "eventId")
    `);

    await queryRunner.query(`
      CREATE TABLE "event_ticket" (
        "id" uuid PRIMARY KEY,
        "eventRegistrationId" uuid NOT NULL UNIQUE,
        "qrCode" text NOT NULL,
        "issuedAt" timestamptz NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_ticket"`);
    await queryRunner.query(`DROP TABLE "event_registration"`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`DROP TYPE "event_registration_status"`);
    await queryRunner.query(`DROP TYPE "event_status"`);
    await queryRunner.query(`DROP TYPE "event_type"`);
  }
}
