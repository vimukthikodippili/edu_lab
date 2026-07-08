import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletionToLessonPlanEntry1785800000000
  implements MigrationInterface
{
  name = 'AddCompletionToLessonPlanEntry1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annual_lesson_plan_entry"
        ADD COLUMN "isComplete"           boolean NOT NULL DEFAULT false,
        ADD COLUMN "actualCompletionDate" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "annual_lesson_plan_entry"
        DROP COLUMN "actualCompletionDate",
        DROP COLUMN "isComplete"
    `);
  }
}
