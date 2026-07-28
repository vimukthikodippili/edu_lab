import { MigrationInterface, QueryRunner } from 'typeorm';

/** Module 12 (MHA) Story 6 (MHA-120) — per-domain symptom checklist + risk level. References
 * mha_session (CASCADE — child rows have no independent existence) and disorder_registry
 * (RESTRICT — domains are soft-deactivate-only, never hard-deleted). */
export class CreateDomainResultTable1792700000000 implements MigrationInterface {
  name = 'CreateDomainResultTable1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE domain_result_level AS ENUM ('not_assessed', 'none', 'low', 'moderate', 'high', 'severe');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "domain_result" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "domainId" uuid NOT NULL,
        "level" domain_result_level NOT NULL DEFAULT 'not_assessed',
        "checkedSymptoms" jsonb NOT NULL DEFAULT '[]',
        "counselorNotes" text,
        "safetyFlagRaised" boolean NOT NULL DEFAULT false,
        "assessedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_domain_result_session_domain" UNIQUE ("sessionId", "domainId"),
        CONSTRAINT "FK_domain_result_session" FOREIGN KEY ("sessionId")
          REFERENCES "mha_session" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_domain_result_domain" FOREIGN KEY ("domainId")
          REFERENCES "disorder_registry" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_domain_result_sessionId" ON "domain_result" ("sessionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_domain_result_sessionId"`);
    await queryRunner.query(`DROP TABLE "domain_result"`);
    await queryRunner.query(`DROP TYPE "domain_result_level"`);
  }
}
