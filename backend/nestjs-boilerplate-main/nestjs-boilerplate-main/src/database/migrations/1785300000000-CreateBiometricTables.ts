import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBiometricTables1785300000000 implements MigrationInterface {
  name = 'CreateBiometricTables1785300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "biometric_consent" (
        "id"            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "guardianId"    UUID        NOT NULL
          REFERENCES "guardian"("id") ON DELETE CASCADE,
        "consentedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "consentedById" UUID        NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "revokedAt"     TIMESTAMPTZ,
        "revokedById"   UUID
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_biometric_consent_guardianId"
        ON "biometric_consent" ("guardianId")
    `);

    // Enforce at most one active (non-revoked) consent per guardian at the DB level
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_biometric_consent_guardian_active"
        ON "biometric_consent" ("guardianId")
        WHERE "revokedAt" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "biometric_vault" (
        "id"           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        "guardianId"   UUID        NOT NULL UNIQUE
          REFERENCES "guardian"("id") ON DELETE CASCADE,
        "templateType" VARCHAR(20) NOT NULL
          CHECK ("templateType" IN ('fingerprint', 'facial', 'both')),
        "ciphertext"   TEXT        NOT NULL,
        "iv"           VARCHAR(24) NOT NULL,
        "authTag"      VARCHAR(32) NOT NULL,
        "enrolledAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_biometric_vault_guardianId"
        ON "biometric_vault" ("guardianId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_biometric_vault_guardianId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "biometric_vault"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_biometric_consent_guardian_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_biometric_consent_guardianId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "biometric_consent"`);
  }
}
