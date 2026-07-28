import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-134 — FR-MHA-33, AC #72. Communication-module audit trail (FR-CM-05) for the non-clinical
 * "Notify Guardian" action, scoped by `source`/`sessionId` rather than reusing the existing
 * `notification_log` table (which is hard-FK'd to `emergency_alert`). One row per (guardian,
 * channel) attempt. */
export class AddParentNotificationLog1793600000000 implements MigrationInterface {
  name = 'AddParentNotificationLog1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "parent_notification_channel" AS ENUM ('sms', 'push')`,
    );
    await queryRunner.query(
      `CREATE TYPE "parent_notification_status" AS ENUM ('sent', 'failed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "parent_notification_log" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "source" varchar(20) NOT NULL,
        "sessionId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "guardianId" uuid NOT NULL,
        "guardianName" varchar(200) NOT NULL,
        "channel" parent_notification_channel NOT NULL,
        "status" parent_notification_status NOT NULL,
        "failureReason" text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "parent_notification_log"`);
    await queryRunner.query(`DROP TYPE "parent_notification_status"`);
    await queryRunner.query(`DROP TYPE "parent_notification_channel"`);
  }
}
