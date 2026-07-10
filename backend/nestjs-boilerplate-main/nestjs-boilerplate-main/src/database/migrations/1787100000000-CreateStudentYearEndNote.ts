import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentYearEndNote1787100000000
  implements MigrationInterface
{
  name = 'CreateStudentYearEndNote1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "student_year_end_note" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "academicYear" varchar(4) NOT NULL,
        "classTeacherStaffId" uuid NOT NULL,
        "position" varchar(100),
        "extracurricularActivities" text,
        "generalRemarks" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("studentId", "academicYear")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "student_year_end_note"`);
  }
}
