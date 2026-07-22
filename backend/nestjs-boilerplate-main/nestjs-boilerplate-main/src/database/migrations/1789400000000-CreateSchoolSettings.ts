import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchoolSettings1789400000000 implements MigrationInterface {
  name = 'CreateSchoolSettings1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "school_settings" (
        "id" SERIAL PRIMARY KEY,
        "lateThresholdMinutes" int NOT NULL DEFAULT 10,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "school_settings"`);
  }
}
