import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarkCorrectionRequestTable1795000000000
  implements MigrationInterface
{
  name = 'CreateMarkCorrectionRequestTable1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mark_correction_request" (
        "id"                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "markId"              UUID          NOT NULL,
        "requestedByTeacherId" UUID         NOT NULL
          REFERENCES "staff"("id") ON DELETE CASCADE,
        "originalScore"       NUMERIC(6,2)  NOT NULL,
        "correctedScore"      NUMERIC(6,2)  NOT NULL,
        "reason"              TEXT          NOT NULL,
        "status"              VARCHAR(20)   NOT NULL DEFAULT 'pending',
        "decidedById"         UUID
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "decidedAt"           TIMESTAMPTZ,
        "decisionNote"        TEXT,
        "createdAt"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMPTZ   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mark_correction_request_markId"
        ON "mark_correction_request" ("markId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mark_correction_request_status"
        ON "mark_correction_request" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mark_correction_request_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mark_correction_request_markId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mark_correction_request"`);
  }
}
