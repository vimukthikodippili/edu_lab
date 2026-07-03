import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeeWaiverRequestTable1784500000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice"
        ADD COLUMN IF NOT EXISTS "discountAmount" NUMERIC(10,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE fee_waiver_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fee_waiver_request" (
        "id"                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
        "studentId"               UUID              NOT NULL
          REFERENCES "student"("id") ON DELETE CASCADE,
        "invoiceId"               UUID              NOT NULL
          REFERENCES "invoice"("id") ON DELETE CASCADE,
        "requestedDiscountAmount" NUMERIC(10,2)      NOT NULL,
        "reason"                  TEXT               NOT NULL,
        "status"                  fee_waiver_status  NOT NULL DEFAULT 'pending',
        "requestedById"           UUID               NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "decidedById"             UUID
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "decidedAt"               TIMESTAMPTZ,
        "decisionNote"            TEXT,
        "createdAt"               TIMESTAMPTZ        NOT NULL DEFAULT now(),
        "updatedAt"               TIMESTAMPTZ        NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fee_waiver_request_status"
        ON "fee_waiver_request" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fee_waiver_request_invoice"
        ON "fee_waiver_request" ("invoiceId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fee_waiver_request_invoice"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fee_waiver_request_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fee_waiver_request"`);
    await queryRunner.query(`DROP TYPE IF EXISTS fee_waiver_status`);
    await queryRunner.query(`
      ALTER TABLE "invoice" DROP COLUMN IF EXISTS "discountAmount"
    `);
  }
}
