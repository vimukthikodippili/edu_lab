import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAcademicPatternFlag1786100000000
  implements MigrationInterface
{
  name = 'CreateAcademicPatternFlag1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "academic_pattern_flag_type_enum" AS ENUM ('attendance_grade_correlation')
    `);
    await queryRunner.query(`
      CREATE TABLE "academic_pattern_flag" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "type" "academic_pattern_flag_type_enum" NOT NULL,
        "description" text NOT NULL,
        "flaggedAt" timestamptz NOT NULL,
        UNIQUE ("studentId", "subjectId", "type")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "academic_pattern_flag"`);
    await queryRunner.query(`DROP TYPE "academic_pattern_flag_type_enum"`);
  }
}
