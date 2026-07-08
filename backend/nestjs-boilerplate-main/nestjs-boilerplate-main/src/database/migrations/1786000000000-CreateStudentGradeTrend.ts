import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentGradeTrend1786000000000
  implements MigrationInterface
{
  name = 'CreateStudentGradeTrend1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "student_grade_trend" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "decliningTrend" boolean NOT NULL DEFAULT false,
        "lastComputedAt" timestamptz,
        UNIQUE ("studentId", "subjectId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "student_grade_trend"`);
  }
}
