import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGradingToSubmission1788700000000
  implements MigrationInterface
{
  name = 'AddGradingToSubmission1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignment_submission"
        ADD COLUMN "grade" varchar(20),
        ADD COLUMN "feedback" text,
        ADD COLUMN "gradedAt" timestamptz,
        ADD COLUMN "gradedByTeacherId" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignment_submission"
        DROP COLUMN "grade",
        DROP COLUMN "feedback",
        DROP COLUMN "gradedAt",
        DROP COLUMN "gradedByTeacherId"
    `);
  }
}
