import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrective migration: the previous migration (1787500000000) created
 * "userId" as uuid, but UserEntity.id in this codebase is a plain numeric
 * auto-increment integer, not a uuid. No student has successfully been
 * linked yet (the type mismatch made every attempt fail), so it's safe to
 * drop and recreate the column with the correct type rather than convert.
 */
export class FixStudentUserIdType1787700000000 implements MigrationInterface {
  name = 'FixStudentUserIdType1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN "userId"`);
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN "userId" integer NULL UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN "userId"`);
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN "userId" uuid NULL UNIQUE
    `);
  }
}
