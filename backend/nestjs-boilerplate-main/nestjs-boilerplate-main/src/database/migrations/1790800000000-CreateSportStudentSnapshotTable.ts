import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSportStudentSnapshotTable1790800000000 implements MigrationInterface {
  name = 'CreateSportStudentSnapshotTable1790800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sport_student_snapshot_trend_flag_enum" AS ENUM('improving', 'stable', 'declining')`,
    );

    await queryRunner.query(`
      CREATE TABLE "sport_student_snapshot" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "sportId" uuid NOT NULL,
        "metricName" character varying NOT NULL,
        "weekEnding" date NOT NULL,
        "rollingAvg" numeric(10,2),
        "trendFlag" "public"."sport_student_snapshot_trend_flag_enum" NOT NULL DEFAULT 'stable',
        "seasonAvg" numeric(10,2),
        "personalBest" numeric(10,2),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_snapshot_student_sport_metric_week" UNIQUE ("studentId", "sportId", "metricName", "weekEnding"),
        CONSTRAINT "FK_snapshot_student" FOREIGN KEY ("studentId")
          REFERENCES "student" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_snapshot_sport" FOREIGN KEY ("sportId")
          REFERENCES "sport" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sport_student_snapshot"`);
    await queryRunner.query(`DROP TYPE "public"."sport_student_snapshot_trend_flag_enum"`);
  }
}
