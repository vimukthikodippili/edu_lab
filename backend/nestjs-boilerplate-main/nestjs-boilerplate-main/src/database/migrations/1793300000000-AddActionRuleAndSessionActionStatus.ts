import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-131 — FR-MHA-23/24/37/32. Adds `status` (open/complete) to `session_action` (FR-MHA-32
 * action-status tracking) and a new `action_rule` table (FR-MHA-37 admin-configurable rule set)
 * seeded with the 6 default rules from the story's AC #54. `riskCategory` is nullable — a NULL
 * row means "any category," used by the Monthly Follow-up catch-all rule (see
 * RecommendedActionService's matching logic). Reuses the pre-existing `disorder_risk_category`
 * (MHA-110) and `domain_result_level` (MHA-120) enum types directly. */
export class AddActionRuleAndSessionActionStatus1793300000000
  implements MigrationInterface
{
  name = 'AddActionRuleAndSessionActionStatus1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "session_action_status" AS ENUM ('open', 'complete')`,
    );
    await queryRunner.query(
      `ALTER TABLE "session_action" ADD COLUMN "status" session_action_status NOT NULL DEFAULT 'open'`,
    );

    await queryRunner.query(`
      CREATE TABLE "action_rule" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "riskCategory" disorder_risk_category NULL,
        "minimumLevel" domain_result_level NOT NULL,
        "actionText" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "priority" int NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO "action_rule" ("riskCategory", "minimumLevel", "actionText", "priority") VALUES
        ('academic_risk', 'moderate', 'School Counselor Review', 1),
        ('learning_disability_risk', 'moderate', 'Educational Psychologist Evaluation', 2),
        ('emotional_risk', 'high', 'Mental Health Counselor Referral', 3),
        ('social_risk', 'high', 'Bullying Intervention Protocol', 4),
        ('addiction_risk', 'high', 'Digital Wellbeing Program', 5),
        (NULL, 'moderate', 'Monthly Follow-up', 6)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "action_rule"`);
    await queryRunner.query(`ALTER TABLE "session_action" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "session_action_status"`);
  }
}
