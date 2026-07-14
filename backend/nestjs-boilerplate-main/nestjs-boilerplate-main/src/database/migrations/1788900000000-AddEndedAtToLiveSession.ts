import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEndedAtToLiveSession1788900000000
  implements MigrationInterface
{
  name = 'AddEndedAtToLiveSession1788900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "live_session"
        ADD COLUMN "endedAt" timestamptz,
        ALTER COLUMN "joinUrl" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "live_session"
        DROP COLUMN "endedAt",
        ALTER COLUMN "joinUrl" SET NOT NULL
    `);
  }
}
