import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYearOnYearToSportStudentSnapshot1790900000000
  implements MigrationInterface
{
  name = 'AddYearOnYearToSportStudentSnapshot1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sport_student_snapshot_year_on_year_flag_enum" AS ENUM('better', 'worse', 'similar')`,
    );

    await queryRunner.query(`
      ALTER TABLE "sport_student_snapshot"
      ADD "lastSeasonAvg" numeric(10,2),
      ADD "yearOnYearFlag" "public"."sport_student_snapshot_year_on_year_flag_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sport_student_snapshot" DROP COLUMN "yearOnYearFlag", DROP COLUMN "lastSeasonAvg"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."sport_student_snapshot_year_on_year_flag_enum"`,
    );
  }
}
