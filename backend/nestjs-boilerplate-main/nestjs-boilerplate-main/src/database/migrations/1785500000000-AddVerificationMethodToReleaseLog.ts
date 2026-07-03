import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerificationMethodToReleaseLog1785500000000 implements MigrationInterface {
  name = 'AddVerificationMethodToReleaseLog1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "biometric_release_log"
        ADD COLUMN "verificationMethod" VARCHAR(20) NOT NULL DEFAULT 'biometric'
          CHECK ("verificationMethod" IN ('biometric', 'manual_override'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "biometric_release_log" DROP COLUMN IF EXISTS "verificationMethod"
    `);
  }
}
