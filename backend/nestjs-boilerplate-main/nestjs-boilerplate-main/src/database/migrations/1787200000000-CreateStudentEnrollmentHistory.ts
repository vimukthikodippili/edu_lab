import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentEnrollmentHistory1787200000000
  implements MigrationInterface
{
  name = 'CreateStudentEnrollmentHistory1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "student_enrollment_history_outcome_enum" AS ENUM (
        'promoted', 'repeated', 'transferred', 'graduated', 'withdrawn'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "student_enrollment_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "academicYear" varchar(4) NOT NULL,
        "gradeId" integer NOT NULL,
        "classSectionId" integer NOT NULL,
        "outcome" "student_enrollment_history_outcome_enum" NOT NULL,
        "recordedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("studentId", "academicYear")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "student_enrollment_history"`);
    await queryRunner.query(
      `DROP TYPE "student_enrollment_history_outcome_enum"`,
    );
  }
}
