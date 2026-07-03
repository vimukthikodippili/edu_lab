import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommunicationTables1784800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pushToken to staff (nullable — staff may not have a registered device)
    await queryRunner.query(`
      ALTER TABLE "staff"
        ADD COLUMN IF NOT EXISTS "pushToken" character varying;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emergency_alert" (
        "id"            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "message"       TEXT          NOT NULL,
        "sentByStaffId" UUID          NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "sentAt"        TIMESTAMPTZ   NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_log" (
        "id"            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "alertId"       UUID          NOT NULL
          REFERENCES "emergency_alert"("id") ON DELETE CASCADE,
        "recipientType" VARCHAR(10)   NOT NULL,
        "recipientId"   UUID          NOT NULL,
        "recipientName" VARCHAR(200)  NOT NULL,
        "channel"       VARCHAR(10)   NOT NULL,
        "status"        VARCHAR(10)   NOT NULL,
        "failureReason" TEXT,
        "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_log_alertId"
        ON "notification_log" ("alertId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_log_alertId_status"
        ON "notification_log" ("alertId", "status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_log_alertId_status";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_log_alertId";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_log";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emergency_alert";`);
    await queryRunner.query(`
      ALTER TABLE "staff" DROP COLUMN IF EXISTS "pushToken";
    `);
  }
}
