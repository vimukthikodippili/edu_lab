import { MigrationInterface, QueryRunner } from 'typeorm';

/** FR-MHA-03/05 — the MHA session shell (case number, student, counselor, screening date,
 * draft/complete status). `studentId` is a bare uuid column with no FK constraint, matching
 * `mha_consent`/`counselor_case`'s established pattern for student-scoped sub-records. */
export class CreateMHASessionTable1792500000000 implements MigrationInterface {
  name = 'CreateMHASessionTable1792500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE mha_session_status AS ENUM ('draft', 'complete');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "mha_session" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "caseNumber" character varying NOT NULL,
        "studentId" uuid NOT NULL,
        "counselorStaffId" uuid NOT NULL,
        "screeningDate" date NOT NULL,
        "status" mha_session_status NOT NULL DEFAULT 'draft',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_mha_session_case_number" UNIQUE ("caseNumber"),
        CONSTRAINT "FK_mha_session_counselor_staff" FOREIGN KEY ("counselorStaffId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_mha_session_studentId" ON "mha_session" ("studentId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_mha_session_studentId"`);
    await queryRunner.query(`DROP TABLE "mha_session"`);
    await queryRunner.query(`DROP TYPE "mha_session_status"`);
  }
}
