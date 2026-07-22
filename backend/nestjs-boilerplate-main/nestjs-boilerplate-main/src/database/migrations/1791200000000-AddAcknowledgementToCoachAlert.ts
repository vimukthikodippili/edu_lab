import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcknowledgementToCoachAlert1791200000000 implements MigrationInterface {
  name = 'AddAcknowledgementToCoachAlert1791200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coach_alert"
      ADD "declineValues" jsonb NOT NULL DEFAULT '[]',
      ADD "acknowledgedAt" timestamptz,
      ADD "acknowledgedByStaffId" uuid
    `);
    await queryRunner.query(`ALTER TABLE "coach_alert" ALTER COLUMN "declineValues" DROP DEFAULT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "coach_alert"
      DROP COLUMN "acknowledgedByStaffId",
      DROP COLUMN "acknowledgedAt",
      DROP COLUMN "declineValues"
    `);
  }
}
