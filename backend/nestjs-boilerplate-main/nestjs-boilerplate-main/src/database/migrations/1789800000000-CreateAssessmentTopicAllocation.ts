import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssessmentTopicAllocation1789800000000
  implements MigrationInterface
{
  name = 'CreateAssessmentTopicAllocation1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assessment_topic_allocation" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "assessmentId" uuid NOT NULL,
        "subjectTopicId" uuid NOT NULL,
        "maxMarks" int NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_assessment_topic_allocation_assessment_topic" UNIQUE ("assessmentId", "subjectTopicId"),
        CONSTRAINT "FK_assessment_topic_allocation_assessment" FOREIGN KEY ("assessmentId")
          REFERENCES "assessment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assessment_topic_allocation_subject_topic" FOREIGN KEY ("subjectTopicId")
          REFERENCES "subject_topic" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assessment_topic_allocation"`);
  }
}
