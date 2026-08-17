import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImprovingTrendToStudentGradeTrend1795300000000
  implements MigrationInterface
{
  name = 'AddImprovingTrendToStudentGradeTrend1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_grade_trend" ADD COLUMN IF NOT EXISTS "improvingTrend" BOOLEAN NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student_grade_trend" DROP COLUMN IF EXISTS "improvingTrend"`);
  }
}
