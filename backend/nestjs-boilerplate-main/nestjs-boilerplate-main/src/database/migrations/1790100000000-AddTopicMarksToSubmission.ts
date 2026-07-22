import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTopicMarksToSubmission1790100000000
  implements MigrationInterface
{
  name = 'AddTopicMarksToSubmission1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignment_submission" ADD COLUMN "totalScore" numeric(6,2)
    `);

    await queryRunner.query(`
      CREATE TABLE "submission_topic_mark" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "submissionId" uuid NOT NULL,
        "subjectTopicId" uuid NOT NULL,
        "score" numeric(6,2) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_submission_topic_mark_submission_topic" UNIQUE ("submissionId", "subjectTopicId"),
        CONSTRAINT "FK_submission_topic_mark_submission" FOREIGN KEY ("submissionId")
          REFERENCES "assignment_submission" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submission_topic_mark_subject_topic" FOREIGN KEY ("subjectTopicId")
          REFERENCES "subject_topic" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "submission_topic_mark"`);
    await queryRunner.query(
      `ALTER TABLE "assignment_submission" DROP COLUMN "totalScore"`,
    );
  }
}
