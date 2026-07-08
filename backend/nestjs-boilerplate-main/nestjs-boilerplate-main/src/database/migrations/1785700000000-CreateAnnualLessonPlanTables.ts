import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnnualLessonPlanTables1785700000000
  implements MigrationInterface
{
  name = 'CreateAnnualLessonPlanTables1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "annual_lesson_plan_entry" (
        "id"                    uuid         NOT NULL DEFAULT gen_random_uuid(),
        "staffId"               uuid         NOT NULL,
        "syllabusUnitId"        uuid         NOT NULL,
        "academicYear"          varchar(4)   NOT NULL,
        "plannedCompletionDate" date         NOT NULL,
        "createdAt"             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annual_lesson_plan_entry"   PRIMARY KEY ("id"),
        CONSTRAINT "UQ_alp_entry"                  UNIQUE ("staffId", "syllabusUnitId"),
        CONSTRAINT "FK_alp_entry_syllabus_unit"    FOREIGN KEY ("syllabusUnitId")
          REFERENCES "syllabus_unit"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_alp_entry_lookup"
        ON "annual_lesson_plan_entry" ("staffId", "academicYear")
    `);

    await queryRunner.query(`
      CREATE TABLE "annual_lesson_plan_submission" (
        "id"          uuid         NOT NULL DEFAULT gen_random_uuid(),
        "staffId"     uuid         NOT NULL,
        "subjectId"   uuid         NOT NULL,
        "gradeId"     int          NOT NULL,
        "academicYear" varchar(4)  NOT NULL,
        "isSubmitted" boolean      NOT NULL DEFAULT false,
        "submittedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_annual_lesson_plan_submission" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_alp_submission"               UNIQUE ("staffId", "subjectId", "gradeId", "academicYear"),
        CONSTRAINT "FK_alp_submission_subject"       FOREIGN KEY ("subjectId")
          REFERENCES "subject"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alp_submission_grade"         FOREIGN KEY ("gradeId")
          REFERENCES "grade"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "annual_lesson_plan_submission"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_alp_entry_lookup"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "annual_lesson_plan_entry"`,
    );
  }
}
