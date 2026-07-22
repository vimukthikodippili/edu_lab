import { MigrationInterface, QueryRunner } from 'typeorm';

/** Student Lab Reports (SRS Section 6, FR-P3-LR-01..11) — assignment + submission/grading,
 * mirroring the LMS Homework AssignmentEntity/SubmissionEntity shape closely (confirmed via
 * research as the explicit design template), plus an optional lazy link into the Phase 1 Grades
 * module (`assessmentId`, populated only when a grade is first recorded and
 * `includeInTermAssessment` is true). */
export class CreateLabReportTables1792200000000 implements MigrationInterface {
  name = 'CreateLabReportTables1792200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lab_report_assignment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "experimentLogId" uuid NOT NULL,
        "classSectionId" integer NOT NULL,
        "subjectId" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "instructions" text NOT NULL,
        "dueDate" date NOT NULL,
        "markingScheme" text NOT NULL,
        "maxMarks" integer NOT NULL,
        "includeInTermAssessment" boolean NOT NULL DEFAULT false,
        "termId" integer,
        "assessmentId" uuid,
        "createdByTeacherId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_lab_report_assignment_experiment_log" FOREIGN KEY ("experimentLogId")
          REFERENCES "experiment_log" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lab_report_assignment_class_section" FOREIGN KEY ("classSectionId")
          REFERENCES "class_section" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_lab_report_assignment_subject" FOREIGN KEY ("subjectId")
          REFERENCES "subject" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_lab_report_assignment_term" FOREIGN KEY ("termId")
          REFERENCES "academic_term" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_lab_report_assignment_assessment" FOREIGN KEY ("assessmentId")
          REFERENCES "assessment" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_lab_report_assignment_staff" FOREIGN KEY ("createdByTeacherId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_lab_report_assignment_experiment_log" ON "lab_report_assignment" ("experimentLogId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_lab_report_assignment_class_section" ON "lab_report_assignment" ("classSectionId")
    `);

    await queryRunner.query(`
      CREATE TABLE "lab_report_submission" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "labReportAssignmentId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "content" text,
        "attachmentFileIds" jsonb NOT NULL DEFAULT '[]',
        "submittedAt" timestamptz NOT NULL DEFAULT now(),
        "grade" numeric(6,2),
        "feedback" text,
        "gradedById" uuid,
        "gradedAt" timestamptz,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_lab_report_submission_assignment_student" UNIQUE ("labReportAssignmentId", "studentId"),
        CONSTRAINT "FK_lab_report_submission_assignment" FOREIGN KEY ("labReportAssignmentId")
          REFERENCES "lab_report_assignment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lab_report_submission_student" FOREIGN KEY ("studentId")
          REFERENCES "student" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lab_report_submission_graded_by" FOREIGN KEY ("gradedById")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_lab_report_submission_assignment" ON "lab_report_submission" ("labReportAssignmentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_lab_report_submission_assignment"`);
    await queryRunner.query(`DROP TABLE "lab_report_submission"`);
    await queryRunner.query(`DROP INDEX "IDX_lab_report_assignment_class_section"`);
    await queryRunner.query(`DROP INDEX "IDX_lab_report_assignment_experiment_log"`);
    await queryRunner.query(`DROP TABLE "lab_report_assignment"`);
  }
}
