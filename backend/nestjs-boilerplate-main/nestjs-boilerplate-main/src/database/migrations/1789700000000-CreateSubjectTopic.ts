import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubjectTopic1789700000000 implements MigrationInterface {
  name = 'CreateSubjectTopic1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subject_topic" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "subjectId" uuid NOT NULL,
        "teacherId" uuid NOT NULL,
        "title" varchar NOT NULL,
        "order" int NOT NULL,
        "isArchived" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subject_topic_subject_teacher_order" UNIQUE ("subjectId", "teacherId", "order")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subject_topic"`);
  }
}
