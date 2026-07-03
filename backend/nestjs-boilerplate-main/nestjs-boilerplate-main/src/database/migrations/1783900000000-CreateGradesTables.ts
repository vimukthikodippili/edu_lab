import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGradesTables1783900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Academic Terms
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "academic_term" (
        "id"           SERIAL          PRIMARY KEY,
        "name"         VARCHAR(80)     NOT NULL,
        "termNumber"   INTEGER         NOT NULL CHECK ("termNumber" BETWEEN 1 AND 3),
        "academicYear" VARCHAR(4)      NOT NULL,
        "startDate"    DATE            NOT NULL,
        "endDate"      DATE            NOT NULL,
        "createdAt"    TIMESTAMPTZ     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_academic_term_number_year" UNIQUE ("termNumber", "academicYear")
      )
    `);

    // Term Assessment Plans
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "term_assessment_plan" (
        "id"                       SERIAL      PRIMARY KEY,
        "subjectId"                UUID        NOT NULL
          REFERENCES "subject"("id") ON DELETE RESTRICT,
        "termId"                   INTEGER     NOT NULL
          REFERENCES "academic_term"("id") ON DELETE RESTRICT,
        "requiredAssessmentCount"  INTEGER     NOT NULL CHECK ("requiredAssessmentCount" BETWEEN 1 AND 10),
        "setBySectionHeadId"       UUID        NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "createdAt"                TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"                TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_term_assessment_plan_subject_term" UNIQUE ("subjectId", "termId")
      )
    `);

    // Assessment Type enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE assessment_type AS ENUM ('monthly_test', 'term_test', 'mock', 'other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Assessments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assessment" (
        "id"                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "subjectId"             UUID        NOT NULL
          REFERENCES "subject"("id") ON DELETE RESTRICT,
        "termId"                INTEGER     NOT NULL
          REFERENCES "academic_term"("id") ON DELETE RESTRICT,
        "classSectionId"        INTEGER     NOT NULL
          REFERENCES "class_section"("id") ON DELETE RESTRICT,
        "title"                 VARCHAR(120) NOT NULL,
        "assessmentType"        assessment_type NOT NULL,
        "scheduledDate"         DATE        NOT NULL,
        "totalMarks"            INTEGER     NOT NULL CHECK ("totalMarks" > 0),
        "createdByTeacherId"    UUID        NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "sectionHeadOverride"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "overrideApprovedById"  UUID
          REFERENCES "staff"("id") ON DELETE SET NULL,
        "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_assessment_subject_term_class"
        ON "assessment" ("subjectId", "termId", "classSectionId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tap_subject_term"
        ON "term_assessment_plan" ("subjectId", "termId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_assessment_subject_term_class"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tap_subject_term"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assessment"`);
    await queryRunner.query(`DROP TYPE IF EXISTS assessment_type`);
    await queryRunner.query(`DROP TABLE IF EXISTS "term_assessment_plan"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_term"`);
  }
}
