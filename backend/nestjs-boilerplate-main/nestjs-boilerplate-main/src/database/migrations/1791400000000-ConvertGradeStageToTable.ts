import { MigrationInterface, QueryRunner } from 'typeorm';

/** Converts GradeStage from a fixed Postgres enum on grade.stage into a real, runtime-writable
 * table — an Admin/Principal can now redefine stage boundaries (a school using Primary=1-6,
 * Junior=7-9 instead of the Sri Lankan default) without a code change. Stage membership becomes
 * a computed range lookup (GradeStageService.resolveStageForLevel) — grade.stage is dropped
 * entirely, not replaced with a new per-grade FK. school_calendar_config.gradeStage (a varchar
 * storing the same enum values, one row per stage) becomes gradeStageId, a real FK to the new
 * table, backfilled via the same code→name mapping used to seed it. */
export class ConvertGradeStageToTable1791400000000 implements MigrationInterface {
  name = 'ConvertGradeStageToTable1791400000000';

  private readonly seedRows: { code: string; stageName: string; fromGrade: number; toGrade: number; ordering: number }[] = [
    { code: 'primary', stageName: 'Primary', fromGrade: 1, toGrade: 5, ordering: 0 },
    { code: 'junior_secondary', stageName: 'Junior Secondary', fromGrade: 6, toGrade: 9, ordering: 1 },
    { code: 'senior_secondary', stageName: 'Senior Secondary', fromGrade: 10, toGrade: 11, ordering: 2 },
    { code: 'collegiate', stageName: 'Collegiate', fromGrade: 12, toGrade: 13, ordering: 3 },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "grade_stage" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "stageName" character varying NOT NULL,
        "fromGrade" integer NOT NULL,
        "toGrade" integer NOT NULL,
        "ordering" integer NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    const idByCode: Record<string, string> = {};
    for (const row of this.seedRows) {
      const inserted = await queryRunner.query(
        `INSERT INTO "grade_stage" ("stageName", "fromGrade", "toGrade", "ordering") VALUES ($1, $2, $3, $4) RETURNING id`,
        [row.stageName, row.fromGrade, row.toGrade, row.ordering],
      );
      idByCode[row.code] = inserted[0].id;
    }

    // school_calendar_config: gradeStage (varchar, one of the 4 enum codes) -> gradeStageId (FK)
    await queryRunner.query(`ALTER TABLE "school_calendar_config" ADD "gradeStageId" uuid`);
    for (const row of this.seedRows) {
      await queryRunner.query(
        `UPDATE "school_calendar_config" SET "gradeStageId" = $1 WHERE "gradeStage" = $2`,
        [idByCode[row.code], row.code],
      );
    }
    await queryRunner.query(`ALTER TABLE "school_calendar_config" ALTER COLUMN "gradeStageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "school_calendar_config" DROP CONSTRAINT "UQ_school_calendar_config_stage"`);
    await queryRunner.query(`
      ALTER TABLE "school_calendar_config" ADD CONSTRAINT "FK_calendar_config_grade_stage" FOREIGN KEY ("gradeStageId")
        REFERENCES "grade_stage" ("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `ALTER TABLE "school_calendar_config" ADD CONSTRAINT "UQ_calendar_config_grade_stage" UNIQUE ("gradeStageId")`,
    );
    await queryRunner.query(`ALTER TABLE "school_calendar_config" DROP COLUMN "gradeStage"`);

    // grade: drop the stage column + its enum type entirely — stage membership is now computed
    await queryRunner.query(`ALTER TABLE "grade" DROP COLUMN "stage"`);
    await queryRunner.query(`DROP TYPE "public"."grade_stage_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."grade_stage_enum" AS ENUM('primary', 'junior_secondary', 'senior_secondary', 'collegiate')`,
    );
    // Best-effort: every existing grade level maps back via the original fixed boundaries — only
    // correct for levels 1-13 under the original ranges; any grade added after this migration
    // (there are none, level is fixed 1-13) or gap-covering edit has no enum equivalent.
    await queryRunner.query(`ALTER TABLE "grade" ADD "stage" "public"."grade_stage_enum"`);
    await queryRunner.query(`UPDATE "grade" SET "stage" = 'primary' WHERE "level" BETWEEN 1 AND 5`);
    await queryRunner.query(`UPDATE "grade" SET "stage" = 'junior_secondary' WHERE "level" BETWEEN 6 AND 9`);
    await queryRunner.query(`UPDATE "grade" SET "stage" = 'senior_secondary' WHERE "level" BETWEEN 10 AND 11`);
    await queryRunner.query(`UPDATE "grade" SET "stage" = 'collegiate' WHERE "level" BETWEEN 12 AND 13`);
    await queryRunner.query(`ALTER TABLE "grade" ALTER COLUMN "stage" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "school_calendar_config" ADD "gradeStage" character varying`);
    for (const row of this.seedRows) {
      await queryRunner.query(
        `UPDATE "school_calendar_config" scc SET "gradeStage" = $1
         FROM "grade_stage" gs WHERE gs.id = scc."gradeStageId" AND gs."stageName" = $2`,
        [row.code, row.stageName],
      );
    }
    await queryRunner.query(`ALTER TABLE "school_calendar_config" ALTER COLUMN "gradeStage" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "school_calendar_config" DROP CONSTRAINT "UQ_calendar_config_grade_stage"`);
    await queryRunner.query(`ALTER TABLE "school_calendar_config" DROP CONSTRAINT "FK_calendar_config_grade_stage"`);
    await queryRunner.query(`ALTER TABLE "school_calendar_config" DROP COLUMN "gradeStageId"`);
    await queryRunner.query(
      `ALTER TABLE "school_calendar_config" ADD CONSTRAINT "UQ_school_calendar_config_stage" UNIQUE ("gradeStage")`,
    );

    await queryRunner.query(`DROP TABLE "grade_stage"`);
  }
}
