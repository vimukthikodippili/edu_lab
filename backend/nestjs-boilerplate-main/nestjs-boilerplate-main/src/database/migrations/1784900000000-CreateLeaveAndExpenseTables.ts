import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaveAndExpenseTables1784900000000
  implements MigrationInterface
{
  name = 'CreateLeaveAndExpenseTables1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leave_request" (
        "id"           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "staffId"      UUID          NOT NULL
          REFERENCES "staff"("id") ON DELETE CASCADE,
        "leaveType"    VARCHAR(20)   NOT NULL,
        "startDate"    DATE          NOT NULL,
        "endDate"      DATE          NOT NULL,
        "reason"       TEXT          NOT NULL,
        "status"       VARCHAR(20)   NOT NULL DEFAULT 'pending',
        "decidedById"  UUID
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "decidedAt"    TIMESTAMPTZ,
        "decisionNote" TEXT,
        "createdAt"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_leave_request_staffId"
        ON "leave_request" ("staffId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_leave_request_status"
        ON "leave_request" ("status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "expense_approval" (
        "id"             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestedById"  UUID           NOT NULL
          REFERENCES "staff"("id") ON DELETE CASCADE,
        "amount"         NUMERIC(10,2)  NOT NULL,
        "category"       VARCHAR(50)    NOT NULL,
        "description"    TEXT           NOT NULL,
        "status"         VARCHAR(20)    NOT NULL DEFAULT 'pending',
        "decidedById"    UUID
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "decidedAt"      TIMESTAMPTZ,
        "decisionNote"   TEXT,
        "createdAt"      TIMESTAMPTZ    NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ    NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_expense_approval_requestedById"
        ON "expense_approval" ("requestedById")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_expense_approval_status"
        ON "expense_approval" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expense_approval_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expense_approval_requestedById"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_approval"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leave_request_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leave_request_staffId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_request"`);
  }
}
