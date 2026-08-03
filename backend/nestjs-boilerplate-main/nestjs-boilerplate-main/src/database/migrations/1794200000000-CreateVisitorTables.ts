import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-VM-01 — Visitor Management (Phase 5). No FK constraints — matches the established
 * bare-uuid-column convention used throughout Events/Exam-Hall (services do their own joins). */
export class CreateVisitorTables1794200000000 implements MigrationInterface {
  name = 'CreateVisitorTables1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "visitor_id_type" AS ENUM ('nic', 'passport', 'other')
    `);
    await queryRunner.query(`
      CREATE TYPE "visitor_type" AS ENUM ('parent', 'government_official', 'contractor', 'job_applicant', 'other')
    `);

    await queryRunner.query(`
      CREATE TABLE "visitor" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "fullName" varchar NOT NULL,
        "idNumber" varchar NOT NULL,
        "idType" "visitor_id_type" NOT NULL,
        "visitorType" "visitor_type" NOT NULL,
        "photoId" uuid,
        "isBlocked" boolean NOT NULL DEFAULT false,
        "blockedReason" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_visitor_id_type_number" UNIQUE ("idType", "idNumber")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "visitor_log" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "visitorId" uuid NOT NULL,
        "purpose" text NOT NULL,
        "hostStaffId" uuid NOT NULL,
        "expectedDepartureTime" timestamptz NOT NULL,
        "signedInAt" timestamptz NOT NULL,
        "signedInById" uuid NOT NULL,
        "signedOutAt" timestamptz,
        "signedOutById" uuid,
        "badgeQrCode" text NOT NULL,
        "qrCodeExpiresAt" timestamptz NOT NULL,
        "overstayAlertedAt" timestamptz,
        "preRegistrationId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_visitor_log_badge_qr_code" UNIQUE ("badgeQrCode")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_visitor_log_visitor" ON "visitor_log" ("visitorId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_visitor_log_open" ON "visitor_log" ("signedOutAt")
    `);

    await queryRunner.query(`
      CREATE TABLE "pre_registered_visitor" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "fullName" varchar NOT NULL,
        "idNumber" varchar,
        "idType" "visitor_id_type",
        "visitorType" "visitor_type" NOT NULL,
        "purpose" text NOT NULL,
        "expectedDate" date NOT NULL,
        "hostStaffId" uuid NOT NULL,
        "createdByStaffId" uuid NOT NULL,
        "consumedVisitorLogId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pre_registered_visitor_expected_date" ON "pre_registered_visitor" ("expectedDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "pre_registered_visitor"`);
    await queryRunner.query(`DROP TABLE "visitor_log"`);
    await queryRunner.query(`DROP TABLE "visitor"`);
    await queryRunner.query(`DROP TYPE "visitor_type"`);
    await queryRunner.query(`DROP TYPE "visitor_id_type"`);
  }
}
