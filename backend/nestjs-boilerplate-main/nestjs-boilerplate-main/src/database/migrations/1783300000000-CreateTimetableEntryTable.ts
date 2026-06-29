import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTimetableEntryTable1783300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "timetable_entry" (
        "id"             SERIAL PRIMARY KEY,
        "academicYear"   varchar(4) NOT NULL,
        "classSectionId" integer NOT NULL,
        "day"            smallint NOT NULL,
        "period"         smallint NOT NULL,
        "teacherId"      uuid NOT NULL,
        "subjectId"      uuid NOT NULL,
        "roomNumber"     varchar(20),
        "generatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_te_class_slot"
          UNIQUE ("classSectionId", "academicYear", "day", "period"),
        CONSTRAINT "UQ_te_teacher_slot"
          UNIQUE ("teacherId", "academicYear", "day", "period"),
        CONSTRAINT "FK_te_class_section"
          FOREIGN KEY ("classSectionId") REFERENCES "class_section"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_te_teacher"
          FOREIGN KEY ("teacherId") REFERENCES "staff"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_te_subject"
          FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "timetable_entry"`);
  }
}
