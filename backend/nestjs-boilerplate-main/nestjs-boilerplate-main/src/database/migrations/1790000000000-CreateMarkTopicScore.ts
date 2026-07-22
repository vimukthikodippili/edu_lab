import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMarkTopicScore1790000000000 implements MigrationInterface {
  name = 'CreateMarkTopicScore1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mark_topic_score" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "markId" uuid NOT NULL,
        "subjectTopicId" uuid NOT NULL,
        "score" numeric(6,2) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_mark_topic_score_mark_topic" UNIQUE ("markId", "subjectTopicId"),
        CONSTRAINT "FK_mark_topic_score_mark" FOREIGN KEY ("markId")
          REFERENCES "mark" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mark_topic_score_subject_topic" FOREIGN KEY ("subjectTopicId")
          REFERENCES "subject_topic" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mark_topic_score"`);
  }
}
