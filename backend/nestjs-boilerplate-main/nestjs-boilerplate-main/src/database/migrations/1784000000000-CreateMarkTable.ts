import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarkTable1784000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE mark_status AS ENUM ('draft', 'submitted');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mark" (
        "id"                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId"           UUID         NOT NULL
          REFERENCES "student"("id") ON DELETE RESTRICT,
        "assessmentId"        UUID         NOT NULL
          REFERENCES "assessment"("id") ON DELETE RESTRICT,
        "score"               NUMERIC(6,2),
        "maxScore"            INTEGER      NOT NULL CHECK ("maxScore" > 0),
        "status"              mark_status  NOT NULL DEFAULT 'draft',
        "enteredByTeacherId"  UUID         NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "createdAt"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_mark_student_assessment" UNIQUE ("studentId", "assessmentId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mark_assessment"
        ON "mark" ("assessmentId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mark_assessment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mark"`);
    await queryRunner.query(`DROP TYPE IF EXISTS mark_status`);
  }
}
