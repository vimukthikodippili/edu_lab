import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignmentSubmission1788600000000
  implements MigrationInterface
{
  name = 'CreateAssignmentSubmission1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assignment_submission" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "assignmentId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "textContent" text,
        "attachmentFileIds" jsonb NOT NULL DEFAULT '[]',
        "submittedAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_submission_assignment" FOREIGN KEY ("assignmentId")
          REFERENCES "assignment"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_submission_student" FOREIGN KEY ("studentId")
          REFERENCES "student"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_submission_assignment_student" ON "assignment_submission" ("assignmentId", "studentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assignment_submission"`);
  }
}
