import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-142 — FR-MHA-32/AC #84-87. Adds who/when/note completion-tracking columns to
 * `session_action`. `completedByStaffId` is a bare `uuid` column with no FK constraint, matching
 * `counselor_case.closedByStaffId`'s own precedent exactly (see CreateCounselorCase migration) —
 * not a new convention. */
export class AddSessionActionCompletionTracking1793700000000
  implements MigrationInterface
{
  name = 'AddSessionActionCompletionTracking1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_action"
        ADD COLUMN "completedAt" timestamptz NULL,
        ADD COLUMN "completedByStaffId" uuid NULL,
        ADD COLUMN "completionNote" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_action"
        DROP COLUMN "completionNote",
        DROP COLUMN "completedByStaffId",
        DROP COLUMN "completedAt"
    `);
  }
}
