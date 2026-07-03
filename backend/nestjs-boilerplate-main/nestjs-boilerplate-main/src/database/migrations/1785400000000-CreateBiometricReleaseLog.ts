import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBiometricReleaseLog1785400000000 implements MigrationInterface {
  name = 'CreateBiometricReleaseLog1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "biometric_release_log" (
        "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "guardianId"       UUID         NOT NULL REFERENCES "guardian"("id") ON DELETE RESTRICT,
        "studentIds"       TEXT         NOT NULL DEFAULT '[]',
        "result"           VARCHAR(20)  NOT NULL CHECK ("result" IN ('match','no_match','blacklisted')),
        "confidence"       NUMERIC(5,2) NOT NULL DEFAULT 0,
        "templateType"     VARCHAR(20)  NOT NULL,
        "teachersNotified" INTEGER      NOT NULL DEFAULT 0,
        "alertsNotified"   INTEGER      NOT NULL DEFAULT 0,
        "verifiedAt"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "createdAt"        TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_biometric_release_log_guardianId"
        ON "biometric_release_log" ("guardianId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_biometric_release_log_verifiedAt"
        ON "biometric_release_log" ("verifiedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_biometric_release_log_verifiedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_biometric_release_log_guardianId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "biometric_release_log"`);
  }
}
