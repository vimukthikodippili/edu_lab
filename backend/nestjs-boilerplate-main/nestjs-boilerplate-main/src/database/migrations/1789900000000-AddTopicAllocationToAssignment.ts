import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTopicAllocationToAssignment1789900000000
  implements MigrationInterface
{
  name = 'AddTopicAllocationToAssignment1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignment" ADD COLUMN "totalMarks" int
    `);
    await queryRunner.query(`
      CREATE TABLE "assignment_topic_allocation" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "assignmentId" uuid NOT NULL,
        "subjectTopicId" uuid NOT NULL,
        "maxMarks" int NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_assignment_topic_allocation_assignment_topic" UNIQUE ("assignmentId", "subjectTopicId"),
        CONSTRAINT "FK_assignment_topic_allocation_assignment" FOREIGN KEY ("assignmentId")
          REFERENCES "assignment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_topic_allocation_subject_topic" FOREIGN KEY ("subjectTopicId")
          REFERENCES "subject_topic" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assignment_topic_allocation"`);
    await queryRunner.query(`ALTER TABLE "assignment" DROP COLUMN "totalMarks"`);
  }
}
