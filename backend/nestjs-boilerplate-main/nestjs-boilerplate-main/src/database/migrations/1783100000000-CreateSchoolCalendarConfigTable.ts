import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchoolCalendarConfigTable1783100000000 implements MigrationInterface {
  name = 'CreateSchoolCalendarConfigTable1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "school_calendar_config" (
        "id"                  SERIAL PRIMARY KEY,
        "gradeStage"          character varying NOT NULL,
        "workingDaysPerWeek"  integer           NOT NULL,
        "periodsPerDay"       integer           NOT NULL,
        "createdAt"           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_school_calendar_config_stage" UNIQUE ("gradeStage")
      )
    `);

    // Seed sensible Sri Lankan school defaults for all four grade stages
    await queryRunner.query(`
      INSERT INTO "school_calendar_config" ("gradeStage", "workingDaysPerWeek", "periodsPerDay") VALUES
        ('primary',          5, 7),
        ('junior_secondary', 5, 8),
        ('senior_secondary', 5, 8),
        ('collegiate',       5, 8)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "school_calendar_config"`);
  }
}
