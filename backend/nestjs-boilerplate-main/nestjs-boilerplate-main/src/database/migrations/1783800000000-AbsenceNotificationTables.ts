import { MigrationInterface, QueryRunner } from 'typeorm';

export class AbsenceNotificationTables1783800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Guardian push token (for future FCM wiring)
    await queryRunner.query(`
      ALTER TABLE "guardian"
        ADD COLUMN IF NOT EXISTS "pushToken" character varying
    `);

    // In-app notifications for guardians (absence alerts)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "guardian_notification" (
        "id"          serial          PRIMARY KEY,
        "guardianId"  uuid            NOT NULL,
        "title"       varchar(120)    NOT NULL,
        "message"     text            NOT NULL,
        "type"        varchar(40)     NOT NULL,
        "metadata"    jsonb,
        "isRead"      boolean         NOT NULL DEFAULT false,
        "createdAt"   timestamptz     NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_guardian_notification_guardianId_createdAt"
        ON "guardian_notification" ("guardianId", "createdAt" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_guardian_notification_guardianId_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "guardian_notification"`);
    await queryRunner.query(
      `ALTER TABLE "guardian" DROP COLUMN IF EXISTS "pushToken"`,
    );
  }
}
