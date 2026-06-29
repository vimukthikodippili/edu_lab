import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeacherSubjectClassRequirementTable1783200000000 implements MigrationInterface {
  name = 'CreateTeacherSubjectClassRequirementTable1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teacher_subject_class_requirement" (
        "id"              SERIAL PRIMARY KEY,
        "teacherId"       uuid        NOT NULL,
        "subjectId"       uuid        NOT NULL,
        "classSectionId"  integer     NOT NULL,
        "periodsPerWeek"  integer     NOT NULL,
        "createdAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tscr_combination"
          UNIQUE ("teacherId", "subjectId", "classSectionId"),
        CONSTRAINT "FK_tscr_teacher"
          FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tscr_subject"
          FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tscr_class_section"
          FOREIGN KEY ("classSectionId") REFERENCES "class_section"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "teacher_subject_class_requirement"`);
  }
}
