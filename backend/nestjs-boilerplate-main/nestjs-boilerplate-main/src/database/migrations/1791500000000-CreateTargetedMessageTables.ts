import { MigrationInterface, QueryRunner } from 'typeorm';

/** Principal composes one message and targets exactly which parents/teachers receive it — a
 * table-backed alternative to the existing broadcast-only EmergencyAlert. targeted_message
 * mirrors emergency_alert's own shape plus the recipient-selection channel flags;
 * targeted_message_recipient mirrors notification_log's shape but scoped one row per
 * (recipient, channel) pair — a disclosed necessary field, since per-channel delivery status
 * (SMS succeeded, Push failed, for the same recipient) can't be represented in a single row. */
export class CreateTargetedMessageTables1791500000000 implements MigrationInterface {
  name = 'CreateTargetedMessageTables1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "targeted_message" (
        "id"              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sentByStaffId"   uuid NOT NULL REFERENCES "staff"("id") ON DELETE RESTRICT,
        "subject"         character varying(200) NOT NULL,
        "body"            text NOT NULL,
        "channelSms"      boolean NOT NULL DEFAULT false,
        "channelEmail"    boolean NOT NULL DEFAULT false,
        "channelPush"     boolean NOT NULL DEFAULT false,
        "recipientCount"  integer NOT NULL,
        "sentAt"          timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "targeted_message_recipient" (
        "id"                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "targetedMessageId"   uuid NOT NULL REFERENCES "targeted_message"("id") ON DELETE CASCADE,
        "recipientType"       character varying(10) NOT NULL,
        "recipientId"         uuid NOT NULL,
        "recipientName"       character varying(200) NOT NULL,
        "channel"             character varying(10) NOT NULL,
        "deliveryStatus"      character varying(10) NOT NULL DEFAULT 'pending',
        "deliveredAt"         timestamptz,
        "failureReason"       text,
        "createdAt"           timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_targeted_message_recipient_messageId"
        ON "targeted_message_recipient" ("targetedMessageId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_targeted_message_recipient_messageId_status"
        ON "targeted_message_recipient" ("targetedMessageId", "deliveryStatus")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_targeted_message_recipient_messageId_status"`);
    await queryRunner.query(`DROP INDEX "IDX_targeted_message_recipient_messageId"`);
    await queryRunner.query(`DROP TABLE "targeted_message_recipient"`);
    await queryRunner.query(`DROP TABLE "targeted_message"`);
  }
}
