import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTopicTermSnapshotTable1795500000000
  implements MigrationInterface
{
  name = 'CreateTopicTermSnapshotTable1795500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "topic_term_snapshot" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "subjectId" uuid NOT NULL REFERENCES "subject"("id") ON DELETE RESTRICT,
        "subjectTopicId" uuid NOT NULL REFERENCES "subject_topic"("id") ON DELETE RESTRICT,
        "termId" integer NOT NULL REFERENCES "academic_term"("id") ON DELETE RESTRICT,
        "classSectionId" integer NOT NULL REFERENCES "class_section"("id") ON DELETE RESTRICT,
        "studentAverage" numeric(5,2) NOT NULL,
        "classAverage" numeric(5,2) NOT NULL,
        "isWeak" boolean NOT NULL,
        "assessmentCount" integer NOT NULL,
        "computedAt" timestamptz NOT NULL DEFAULT now(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_topic_term_snapshot" UNIQUE ("studentId", "subjectTopicId", "termId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_topic_term_snapshot_student_subject"
        ON "topic_term_snapshot" ("studentId", "subjectId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_topic_term_snapshot_student_subject"`,
    );
    await queryRunner.query(`DROP TABLE "topic_term_snapshot"`);
  }
}
