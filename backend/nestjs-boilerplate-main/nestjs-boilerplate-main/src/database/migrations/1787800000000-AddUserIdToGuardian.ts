import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToGuardian1787800000000 implements MigrationInterface {
  name = 'AddUserIdToGuardian1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "guardian"
      ADD COLUMN "userId" integer NULL UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "guardian" DROP COLUMN "userId"`);
  }
}
