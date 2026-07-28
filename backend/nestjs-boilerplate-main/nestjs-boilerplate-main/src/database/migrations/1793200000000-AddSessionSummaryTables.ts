import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-124 — FR-MHA-19/20/23/26. Adds `completedAt` to `mha_session` and two new tables:
 * `risk_summary` (one row per RiskCategory per completed session — 7 rows, the FR-MHA-19/20
 * category rollup) and `session_action` (the FR-MHA-23 recommended-action list, ordered by
 * `sortOrder`). Both reference pre-existing Postgres enum types (`disorder_risk_category` from
 * MHA-110, `domain_result_level` from MHA-120) directly — no new `CREATE TYPE` needed. */
export class AddSessionSummaryTables1793200000000 implements MigrationInterface {
  name = 'AddSessionSummaryTables1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mha_session" ADD COLUMN "completedAt" timestamptz`);

    await queryRunner.query(`
      CREATE TABLE "risk_summary" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "riskCategory" disorder_risk_category NOT NULL,
        "level" domain_result_level NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_risk_summary_session_category" UNIQUE ("sessionId", "riskCategory"),
        CONSTRAINT "FK_risk_summary_session" FOREIGN KEY ("sessionId")
          REFERENCES "mha_session" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "session_action" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "actionText" text NOT NULL,
        "sortOrder" int NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_session_action_session" FOREIGN KEY ("sessionId")
          REFERENCES "mha_session" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "session_action"`);
    await queryRunner.query(`DROP TABLE "risk_summary"`);
    await queryRunner.query(`ALTER TABLE "mha_session" DROP COLUMN "completedAt"`);
  }
}
