import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTopicWeaknessFlag1790200000000
  implements MigrationInterface
{
  name = 'CreateTopicWeaknessFlag1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "topic_weakness_flag" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "subjectTopicId" uuid NOT NULL,
        "classSectionId" int NOT NULL,
        "isWeak" boolean NOT NULL,
        "studentAverage" numeric(5,2) NOT NULL,
        "classAverage" numeric(5,2) NOT NULL,
        "computedAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_topic_weakness_flag_student_topic" UNIQUE ("studentId", "subjectTopicId"),
        CONSTRAINT "FK_topic_weakness_flag_subject_topic" FOREIGN KEY ("subjectTopicId")
          REFERENCES "subject_topic" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "topic_weakness_flag"`);
  }
}
