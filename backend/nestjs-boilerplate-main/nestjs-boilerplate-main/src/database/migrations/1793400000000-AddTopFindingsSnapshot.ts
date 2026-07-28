import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-132 — FR-MHA-22/AC #62. Denormalized snapshot of a completed session's Top Findings
 * (High/Severe DomainResult rows, enriched with section/riskCategory), computed once at
 * completion by TopFindingsService and read directly thereafter — replaces the prior
 * live-recompute-on-every-read approach (which also duplicated RiskAggregationService's logic). */
export class AddTopFindingsSnapshot1793400000000 implements MigrationInterface {
  name = 'AddTopFindingsSnapshot1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mha_session" ADD COLUMN "topFindingsSnapshot" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "mha_session" DROP COLUMN "topFindingsSnapshot"`);
  }
}
