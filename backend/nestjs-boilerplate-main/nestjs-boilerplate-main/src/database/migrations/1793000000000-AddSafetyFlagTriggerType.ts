import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-122 — adds a new counselor_case trigger type for MHA safety-flag escalations, distinct
 * from the existing wellbeing-detection triggers (behavioral_observations, low_mood_checkins)
 * so a safety-flag case can be found/updated independently and never silently merged with an
 * unrelated open case for the same student. */
export class AddSafetyFlagTriggerType1793000000000 implements MigrationInterface {
  name = 'AddSafetyFlagTriggerType1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "counselor_case_trigger_type_enum" ADD VALUE IF NOT EXISTS 'mha_safety_flag'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres has no DROP VALUE for enums — additive, non-destructive; down is a no-op.
  }
}
