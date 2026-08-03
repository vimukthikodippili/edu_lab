import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-PP-04 — Digital Consent Forms (Phase 5). No FK constraints — matches the established
 * bare-uuid-column convention used throughout Events/Exam-Hall/Visitors/PTM/Feedback (services do
 * their own joins). `targetGrades`/`targetStudentIds` are jsonb, not native arrays — matches the
 * established list-of-values convention. */
export class CreateConsentFormTables1794600000000 implements MigrationInterface {
  name = 'CreateConsentFormTables1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "consent_target_type" AS ENUM ('all_parents', 'specific_grades', 'specific_students')`,
    );
    await queryRunner.query(`CREATE TYPE "consent_response_type" AS ENUM ('signed', 'declined')`);

    await queryRunner.query(`
      CREATE TABLE "consent_form" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "targetType" "consent_target_type" NOT NULL,
        "targetGrades" jsonb,
        "targetStudentIds" jsonb,
        "deadline" date NOT NULL,
        "createdByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_consent_form_deadline" ON "consent_form" ("deadline")`);

    await queryRunner.query(`
      CREATE TABLE "consent_response" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "consentFormId" uuid NOT NULL,
        "guardianId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "response" "consent_response_type" NOT NULL,
        "reason" varchar,
        "respondedAt" timestamptz NOT NULL,
        "ipAddress" varchar,
        CONSTRAINT "UQ_consent_response_form_student" UNIQUE ("consentFormId", "studentId")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_consent_response_guardian" ON "consent_response" ("guardianId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "consent_response"`);
    await queryRunner.query(`DROP TABLE "consent_form"`);
    await queryRunner.query(`DROP TYPE "consent_response_type"`);
    await queryRunner.query(`DROP TYPE "consent_target_type"`);
  }
}
