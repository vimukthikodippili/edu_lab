import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-VM-02 — Daily Visitor Summary (Phase 5). One row per date, written by the daily cron. */
export class CreateDailyVisitorSummaryTable1794300000000 implements MigrationInterface {
  name = 'CreateDailyVisitorSummaryTable1794300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "daily_visitor_summary" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "date" date NOT NULL,
        "totalVisitors" int NOT NULL,
        "byType" jsonb NOT NULL,
        "averageDurationMinutes" numeric NOT NULL,
        "overstayCount" int NOT NULL,
        "generatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_daily_visitor_summary_date" UNIQUE ("date")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "daily_visitor_summary"`);
  }
}
