import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicSportsBoardToggle1791100000000 implements MigrationInterface {
  name = 'AddPublicSportsBoardToggle1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "school_settings"
      ADD "isPublicSportsBoardEnabled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "school_settings" DROP COLUMN "isPublicSportsBoardEnabled"`,
    );
  }
}
