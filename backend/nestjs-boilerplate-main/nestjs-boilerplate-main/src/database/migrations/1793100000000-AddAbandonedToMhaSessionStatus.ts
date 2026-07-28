import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-123 — AC #3, session auto-abandonment. Postgres has no ALTER TYPE ... DROP VALUE, so
 * down() is a documented no-op (same precedent as the prior enum-extension migration in this
 * module family, 1793000000000-AddSafetyFlagTriggerType.ts). */
export class AddAbandonedToMhaSessionStatus1793100000000 implements MigrationInterface {
  name = 'AddAbandonedToMhaSessionStatus1793100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "mha_session_status" ADD VALUE IF NOT EXISTS 'abandoned'`);
  }

  public async down(): Promise<void> {
    // No-op — Postgres cannot drop an enum value.
  }
}
