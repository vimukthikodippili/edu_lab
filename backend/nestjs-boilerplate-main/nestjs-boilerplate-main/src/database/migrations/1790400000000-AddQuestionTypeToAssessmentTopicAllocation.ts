import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionTypeToAssessmentTopicAllocation1790400000000
  implements MigrationInterface
{
  name = 'AddQuestionTypeToAssessmentTopicAllocation1790400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."assessment_topic_allocation_question_type_enum" AS ENUM('mcq', 'structured', 'essay')`,
    );
    await queryRunner.query(`
      ALTER TABLE "assessment_topic_allocation"
      ADD COLUMN "questionType" "public"."assessment_topic_allocation_question_type_enum"
      NOT NULL DEFAULT 'structured'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assessment_topic_allocation" DROP COLUMN "questionType"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."assessment_topic_allocation_question_type_enum"`,
    );
  }
}
