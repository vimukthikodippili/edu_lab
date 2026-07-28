import { MigrationInterface, QueryRunner } from 'typeorm';

/** FR-MHA-01 — guardian consent gate for MHA screening sessions. `studentId` is a bare uuid
 * column with no FK constraint, matching this codebase's established pattern for student-scoped
 * sub-records (see `counselor_case`). The partial unique index is the load-bearing piece: it
 * enforces "at most one active (non-superseded) consent per student" at the DB level, mirroring
 * the same idiom already used for `biometric_consent` (`WHERE "revokedAt" IS NULL`). */
export class CreateMHAConsentTable1792400000000 implements MigrationInterface {
  name = 'CreateMHAConsentTable1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE mha_consent_method AS ENUM ('in_person', 'written', 'digital');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "mha_consent" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "guardianId" uuid,
        "guardianName" character varying NOT NULL,
        "guardianContact" character varying NOT NULL,
        "method" mha_consent_method NOT NULL,
        "consentedAt" timestamptz NOT NULL,
        "recordedByStaffId" uuid NOT NULL,
        "supersededAt" timestamptz,
        "supersededByConsentId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_mha_consent_guardian" FOREIGN KEY ("guardianId")
          REFERENCES "guardian" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_mha_consent_recorded_by_staff" FOREIGN KEY ("recordedByStaffId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_mha_consent_superseded_by" FOREIGN KEY ("supersededByConsentId")
          REFERENCES "mha_consent" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_mha_consent_studentId" ON "mha_consent" ("studentId")`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_mha_consent_student_active"
        ON "mha_consent" ("studentId")
        WHERE "supersededAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_mha_consent_student_active"`);
    await queryRunner.query(`DROP INDEX "IDX_mha_consent_studentId"`);
    await queryRunner.query(`DROP TABLE "mha_consent"`);
    await queryRunner.query(`DROP TYPE "mha_consent_method"`);
  }
}
