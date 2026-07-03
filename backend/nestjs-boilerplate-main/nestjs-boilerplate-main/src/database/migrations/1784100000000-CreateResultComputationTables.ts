import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateResultComputationTables1784100000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "grading_band" (
        "id"          SERIAL       PRIMARY KEY,
        "minPercent"  NUMERIC(5,2) NOT NULL,
        "maxPercent"  NUMERIC(5,2) NOT NULL,
        "letter"      VARCHAR(4)   NOT NULL,
        "ordering"    INTEGER      NOT NULL,
        "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_grading_band_range" CHECK ("minPercent" <= "maxPercent")
      )
    `);

    // Seed Sri Lankan-style default bands. Bands are [min, max] inclusive at
    // both ends; upper bounds use .99 (except the top band, which legitimately
    // ends at 100.00) so every percentage value falls into exactly one band.
    await queryRunner.query(`
      INSERT INTO "grading_band" ("minPercent", "maxPercent", "letter", "ordering") VALUES
        (75.00, 100.00, 'A', 1),
        (65.00, 74.99,  'B', 2),
        (55.00, 64.99,  'C', 3),
        (35.00, 54.99,  'S', 4),
        (0.00,  34.99,  'W', 5)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subject_result" (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId"      UUID         NOT NULL
          REFERENCES "student"("id") ON DELETE CASCADE,
        "subjectId"      UUID         NOT NULL
          REFERENCES "subject"("id") ON DELETE RESTRICT,
        "termId"         INTEGER      NOT NULL
          REFERENCES "academic_term"("id") ON DELETE RESTRICT,
        "classSectionId" INTEGER      NOT NULL
          REFERENCES "class_section"("id") ON DELETE RESTRICT,
        "totalScore"     NUMERIC(8,2) NOT NULL DEFAULT 0,
        "totalMaxScore"  NUMERIC(8,2) NOT NULL DEFAULT 0,
        "percentage"     NUMERIC(5,2),
        "letterGrade"    VARCHAR(4),
        "isComplete"     BOOLEAN      NOT NULL DEFAULT false,
        "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subject_result_student_subject_term" UNIQUE ("studentId", "subjectId", "termId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subject_result_class_term"
        ON "subject_result" ("classSectionId", "termId")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "term_result" (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId"      UUID         NOT NULL
          REFERENCES "student"("id") ON DELETE CASCADE,
        "termId"         INTEGER      NOT NULL
          REFERENCES "academic_term"("id") ON DELETE RESTRICT,
        "classSectionId" INTEGER      NOT NULL
          REFERENCES "class_section"("id") ON DELETE RESTRICT,
        "totalScore"     NUMERIC(9,2) NOT NULL DEFAULT 0,
        "totalMaxScore"  NUMERIC(9,2) NOT NULL DEFAULT 0,
        "percentage"     NUMERIC(5,2),
        "rank"           INTEGER,
        "isComplete"     BOOLEAN      NOT NULL DEFAULT false,
        "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_term_result_student_term" UNIQUE ("studentId", "termId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_term_result_class_term"
        ON "term_result" ("classSectionId", "termId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_term_result_class_term"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "term_result"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subject_result_class_term"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subject_result"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "grading_band"`);
  }
}
