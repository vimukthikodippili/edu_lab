import { MigrationInterface, QueryRunner } from 'typeorm';

/** Module 12 (MHA) Story 5 — Recommended Assessment Matrix (SRS Addendum §12.4). References
 * disorder_registry (must run after CreateDisorderRegistryTable); seeding happens via the
 * assessment-matrix seed service, not inline here. */
export class CreateAssessmentMatrixEntryTable1792600000000
  implements MigrationInterface
{
  name = 'CreateAssessmentMatrixEntryTable1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE assessment_matrix_age_band AS ENUM ('5_8', '9_12', '13_15', '16_19');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "assessment_matrix_entry" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "domainId" uuid NOT NULL,
        "ageBand" assessment_matrix_age_band NOT NULL,
        "recommended" boolean NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_assessment_matrix_domain_age_band" UNIQUE ("domainId", "ageBand"),
        CONSTRAINT "FK_assessment_matrix_domain" FOREIGN KEY ("domainId")
          REFERENCES "disorder_registry" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_assessment_matrix_domainId" ON "assessment_matrix_entry" ("domainId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_assessment_matrix_domainId"`);
    await queryRunner.query(`DROP TABLE "assessment_matrix_entry"`);
    await queryRunner.query(`DROP TYPE "assessment_matrix_age_band"`);
  }
}
