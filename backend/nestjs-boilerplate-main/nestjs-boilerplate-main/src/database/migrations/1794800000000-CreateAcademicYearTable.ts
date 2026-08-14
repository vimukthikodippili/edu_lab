import { MigrationInterface, QueryRunner } from 'typeorm';

/** Section Head follow-up — "academic year" previously existed only as a free-text string
 * repeated on academic_term/class_section/student, with no owning row. This is a lightweight
 * status marker (active/ended) — deliberately no enforcement elsewhere; ending a year just stops
 * it from being offered as a target for new terms/sections going forward. */
export class CreateAcademicYearTable1794800000000
  implements MigrationInterface
{
  name = 'CreateAcademicYearTable1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE academic_year_status AS ENUM ('active', 'ended');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "academic_year" (
        "id"          SERIAL                PRIMARY KEY,
        "year"        VARCHAR(4)            NOT NULL UNIQUE,
        "status"      academic_year_status  NOT NULL DEFAULT 'active',
        "endedAt"     TIMESTAMPTZ,
        "endedById"   UUID
          REFERENCES "staff"("id") ON DELETE SET NULL,
        "createdAt"   TIMESTAMPTZ           NOT NULL DEFAULT now()
      )
    `);

    // Backfill: every year already in use on class_section/academic_term becomes a real, active
    // academic_year row — otherwise the current year would immediately vanish from the new
    // "select an active year" dropdowns the moment this ships, blocking anyone from adding a
    // section or term to the year that's already in progress.
    await queryRunner.query(`
      INSERT INTO "academic_year" ("year", "status")
      SELECT DISTINCT "academicYear", 'active'::academic_year_status
      FROM (
        SELECT "academicYear" FROM "class_section"
        UNION
        SELECT "academicYear" FROM "academic_term"
      ) existing_years
      ON CONFLICT ("year") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_year"`);
    await queryRunner.query(`DROP TYPE IF EXISTS academic_year_status`);
  }
}
