import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcademicYearToCareerAssessment1788300000000
  implements MigrationInterface
{
  name = 'AddAcademicYearToCareerAssessment1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "career_assessment" ADD COLUMN "academicYear" varchar
    `);
    // Backfill any pre-existing rows (none expected yet, but safe) from createdAt's year.
    await queryRunner.query(`
      UPDATE "career_assessment" SET "academicYear" = EXTRACT(YEAR FROM "createdAt")::text
      WHERE "academicYear" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "career_assessment" ALTER COLUMN "academicYear" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "career_assessment" DROP COLUMN "academicYear"`);
  }
}
