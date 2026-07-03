import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLetterGradeToTermResult1785100000000
  implements MigrationInterface
{
  name = 'AddLetterGradeToTermResult1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "term_result"
        ADD COLUMN IF NOT EXISTS "letterGrade" VARCHAR(4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "term_result" DROP COLUMN IF EXISTS "letterGrade"
    `);
  }
}
