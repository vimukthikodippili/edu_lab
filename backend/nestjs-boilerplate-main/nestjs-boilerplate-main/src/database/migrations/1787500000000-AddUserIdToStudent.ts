import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToStudent1787500000000 implements MigrationInterface {
  name = 'AddUserIdToStudent1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN "userId" uuid NULL UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN "userId"`);
  }
}
