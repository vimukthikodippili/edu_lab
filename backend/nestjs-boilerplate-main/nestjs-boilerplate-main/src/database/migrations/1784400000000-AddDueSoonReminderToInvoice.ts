import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDueSoonReminderToInvoice1784400000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice"
        ADD COLUMN IF NOT EXISTS "dueSoonReminderSentAt" TIMESTAMPTZ
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "invoice" DROP COLUMN IF EXISTS "dueSoonReminderSentAt"
    `);
  }
}
