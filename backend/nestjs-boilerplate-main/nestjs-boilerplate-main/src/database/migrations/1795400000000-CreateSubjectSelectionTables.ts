import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubjectSelectionTables1795400000000
  implements MigrationInterface
{
  name = 'CreateSubjectSelectionTables1795400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subject_selection_window" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "gradeStageId" uuid NOT NULL REFERENCES "grade_stage"("id") ON DELETE RESTRICT,
        "academicYear" varchar(4) NOT NULL,
        "openDate" timestamptz NOT NULL,
        "closeDate" timestamptz NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "minOptionalSubjects" integer NOT NULL DEFAULT 0,
        "maxOptionalSubjects" integer NOT NULL DEFAULT 0,
        "requiresStreamSelection" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subject_selection_window_core_subject" (
        "windowId" uuid NOT NULL REFERENCES "subject_selection_window"("id") ON DELETE CASCADE,
        "subjectId" uuid NOT NULL REFERENCES "subject"("id") ON DELETE CASCADE,
        PRIMARY KEY ("windowId", "subjectId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subject_selection_window_optional_subject" (
        "windowId" uuid NOT NULL REFERENCES "subject_selection_window"("id") ON DELETE CASCADE,
        "subjectId" uuid NOT NULL REFERENCES "subject"("id") ON DELETE CASCADE,
        PRIMARY KEY ("windowId", "subjectId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subject_selection_request" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "windowId" uuid NOT NULL REFERENCES "subject_selection_window"("id") ON DELETE RESTRICT,
        "streamId" integer NULL REFERENCES "al_stream"("id") ON DELETE RESTRICT,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "submittedAt" timestamptz NOT NULL DEFAULT now(),
        "reviewedAt" timestamptz NULL,
        "reviewedById" uuid NULL REFERENCES "staff"("id") ON DELETE RESTRICT,
        "reviewNote" text NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subject_selection_request_student_window"
        ON "subject_selection_request" ("studentId", "windowId")
    `);

    await queryRunner.query(`
      CREATE TABLE "subject_selection_request_item" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requestId" uuid NOT NULL REFERENCES "subject_selection_request"("id") ON DELETE CASCADE,
        "subjectId" uuid NOT NULL REFERENCES "subject"("id") ON DELETE RESTRICT,
        "selectionType" varchar(20) NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "student_subject_enrollment"
        ADD COLUMN "selectionType" varchar(20) NULL,
        ADD COLUMN "selectedByStudent" boolean NOT NULL DEFAULT false,
        ADD COLUMN "approvedAt" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student_subject_enrollment"
        DROP COLUMN "approvedAt",
        DROP COLUMN "selectedByStudent",
        DROP COLUMN "selectionType"
    `);
    await queryRunner.query(`DROP TABLE "subject_selection_request_item"`);
    await queryRunner.query(
      `DROP INDEX "IDX_subject_selection_request_student_window"`,
    );
    await queryRunner.query(`DROP TABLE "subject_selection_request"`);
    await queryRunner.query(
      `DROP TABLE "subject_selection_window_optional_subject"`,
    );
    await queryRunner.query(
      `DROP TABLE "subject_selection_window_core_subject"`,
    );
    await queryRunner.query(`DROP TABLE "subject_selection_window"`);
  }
}
