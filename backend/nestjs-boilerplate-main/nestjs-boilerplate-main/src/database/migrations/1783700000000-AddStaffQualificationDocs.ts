import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffQualificationDocs1783700000000 implements MigrationInterface {
  name = 'AddStaffQualificationDocs1783700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff"
        ADD COLUMN IF NOT EXISTS "qualificationDocIds" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff"
        DROP COLUMN IF EXISTS "qualificationDocIds"
    `);
  }
}
