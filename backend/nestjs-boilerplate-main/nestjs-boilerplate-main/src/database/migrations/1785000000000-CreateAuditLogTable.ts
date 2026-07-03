import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogTable1785000000000 implements MigrationInterface {
  name = 'CreateAuditLogTable1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id"         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "actorId"    UUID          NOT NULL,
        "action"     VARCHAR(20)   NOT NULL,
        "targetType" VARCHAR(20)   NOT NULL,
        "targetId"   UUID          NOT NULL,
        "reason"     TEXT,
        "createdAt"  TIMESTAMPTZ   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_log_actorId"
        ON "audit_log" ("actorId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_log_targetId"
        ON "audit_log" ("targetId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_log_targetType_targetId"
        ON "audit_log" ("targetType", "targetId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_targetType_targetId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_targetId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_log_actorId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log"`);
  }
}
