import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeesTables1784300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fee_structure" (
        "id"          SERIAL        PRIMARY KEY,
        "gradeId"     INTEGER       NOT NULL
          REFERENCES "grade"("id") ON DELETE RESTRICT,
        "termId"      INTEGER       NOT NULL
          REFERENCES "academic_term"("id") ON DELETE RESTRICT,
        "feeCategory" VARCHAR(100)  NOT NULL,
        "amount"      NUMERIC(10,2) NOT NULL,
        "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_fee_structure_grade_term_category" UNIQUE ("gradeId", "termId", "feeCategory")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fee_structure_grade_term"
        ON "fee_structure" ("gradeId", "termId")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'overdue');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoice" (
        "id"        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId" UUID           NOT NULL
          REFERENCES "student"("id") ON DELETE CASCADE,
        "termId"    INTEGER        NOT NULL
          REFERENCES "academic_term"("id") ON DELETE RESTRICT,
        "amount"    NUMERIC(10,2)  NOT NULL,
        "status"    invoice_status NOT NULL DEFAULT 'pending',
        "dueDate"   DATE           NOT NULL,
        "createdAt" TIMESTAMPTZ    NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_invoice_student_term" UNIQUE ("studentId", "termId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invoice_term"
        ON "invoice" ("termId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoice_term"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoice"`);
    await queryRunner.query(`DROP TYPE IF EXISTS invoice_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fee_structure_grade_term"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fee_structure"`);
  }
}
