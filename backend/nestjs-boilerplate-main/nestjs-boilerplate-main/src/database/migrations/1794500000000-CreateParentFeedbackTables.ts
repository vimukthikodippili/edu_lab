import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-PP-03 — Parent Feedback & Complaints (Phase 5). No FK constraints — matches the established
 * bare-uuid-column convention used throughout Events/Exam-Hall/Visitors/PTM (services do their
 * own joins). */
export class CreateParentFeedbackTables1794500000000 implements MigrationInterface {
  name = 'CreateParentFeedbackTables1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "feedback_category" AS ENUM ('academic', 'facilities', 'staff', 'other')`);
    await queryRunner.query(`CREATE TYPE "feedback_status" AS ENUM ('received', 'under_review', 'resolved')`);

    await queryRunner.query(`
      CREATE TABLE "parent_feedback" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "guardianId" uuid NOT NULL,
        "studentId" uuid,
        "subject" varchar NOT NULL,
        "body" text NOT NULL,
        "category" "feedback_category" NOT NULL,
        "status" "feedback_status" NOT NULL DEFAULT 'received',
        "referenceNumber" varchar NOT NULL,
        "submittedAt" timestamptz NOT NULL,
        "resolvedAt" timestamptz,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_parent_feedback_reference_number" UNIQUE ("referenceNumber")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_parent_feedback_guardian" ON "parent_feedback" ("guardianId")`);
    await queryRunner.query(`CREATE INDEX "IDX_parent_feedback_status" ON "parent_feedback" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "feedback_response" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "parentFeedbackId" uuid NOT NULL,
        "respondedById" uuid NOT NULL,
        "responseBody" text NOT NULL,
        "respondedAt" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_feedback_response_parent_feedback" ON "feedback_response" ("parentFeedbackId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "feedback_response"`);
    await queryRunner.query(`DROP TABLE "parent_feedback"`);
    await queryRunner.query(`DROP TYPE "feedback_status"`);
    await queryRunner.query(`DROP TYPE "feedback_category"`);
  }
}
