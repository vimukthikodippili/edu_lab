import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassAverageAndSubjectRankToResults1795200000000
  implements MigrationInterface
{
  name = 'AddClassAverageAndSubjectRankToResults1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "term_result" ADD COLUMN IF NOT EXISTS "classAveragePercentage" NUMERIC(5,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "term_result" ADD COLUMN IF NOT EXISTS "percentile" NUMERIC(5,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "subject_result" ADD COLUMN IF NOT EXISTS "subjectRank" INT
    `);
    await queryRunner.query(`
      ALTER TABLE "subject_result" ADD COLUMN IF NOT EXISTS "subjectClassAveragePercentage" NUMERIC(5,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subject_result" DROP COLUMN IF EXISTS "subjectClassAveragePercentage"`);
    await queryRunner.query(`ALTER TABLE "subject_result" DROP COLUMN IF EXISTS "subjectRank"`);
    await queryRunner.query(`ALTER TABLE "term_result" DROP COLUMN IF EXISTS "percentile"`);
    await queryRunner.query(`ALTER TABLE "term_result" DROP COLUMN IF EXISTS "classAveragePercentage"`);
  }
}
