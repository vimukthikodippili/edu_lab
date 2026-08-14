import { MigrationInterface, QueryRunner } from 'typeorm';

/** QA follow-up (LA-005/LA-007) — login lockout counters + a single-use password-reset token
 * tracker. `passwordResetHash` holds the currently-outstanding, unconsumed reset JWT (set on
 * forgot-password, cleared on reset) so a reset link can only be used once and an older link is
 * automatically invalidated by a newer request. */
export class AddLoginSecurityColumnsToUser1794700000000
  implements MigrationInterface
{
  name = 'AddLoginSecurityColumnsToUser1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN "failedLoginAttempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN "lockedUntil" timestamptz,
        ADD COLUMN "passwordResetHash" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN "failedLoginAttempts",
        DROP COLUMN "lockedUntil",
        DROP COLUMN "passwordResetHash"
    `);
  }
}
