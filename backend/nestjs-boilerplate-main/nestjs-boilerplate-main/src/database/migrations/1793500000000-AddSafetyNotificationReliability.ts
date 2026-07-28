import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-133 — FR-MHA-15/16/18, NFR-MHA-02. Adds `notification_delivery_log` (per-recipient,
 * per-channel delivery tracking with retry state, for the Principal-facing Safety Alerts feed —
 * AC #3) and `counselor_case.priority` (routine/urgent — AC #4, kept independent of the existing
 * `status` open/closed lifecycle column). */
export class AddSafetyNotificationReliability1793500000000
  implements MigrationInterface
{
  name = 'AddSafetyNotificationReliability1793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "delivery_channel" AS ENUM ('sms', 'push')`);
    await queryRunner.query(
      `CREATE TYPE "delivery_status" AS ENUM ('queued', 'sent', 'failed', 'retrying')`,
    );
    await queryRunner.query(`
      CREATE TABLE "notification_delivery_log" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "alertId" uuid NOT NULL,
        "sessionId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "recipientStaffId" uuid NOT NULL,
        "channel" delivery_channel NOT NULL,
        "status" delivery_status NOT NULL DEFAULT 'queued',
        "attempts" int NOT NULL DEFAULT 0,
        "lastAttemptAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "counselor_case_priority_enum" AS ENUM ('routine', 'urgent')`,
    );
    await queryRunner.query(
      `ALTER TABLE "counselor_case" ADD COLUMN "priority" counselor_case_priority_enum NOT NULL DEFAULT 'routine'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "counselor_case" DROP COLUMN "priority"`);
    await queryRunner.query(`DROP TYPE "counselor_case_priority_enum"`);
    await queryRunner.query(`DROP TABLE "notification_delivery_log"`);
    await queryRunner.query(`DROP TYPE "delivery_status"`);
    await queryRunner.query(`DROP TYPE "delivery_channel"`);
  }
}
