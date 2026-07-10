import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCounselorCase1788000000000 implements MigrationInterface {
  name = 'CreateCounselorCase1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "counselor_case_trigger_type_enum" AS ENUM ('behavioral_observations', 'low_mood_checkins')
    `);
    await queryRunner.query(`
      CREATE TYPE "counselor_case_status_enum" AS ENUM ('open', 'closed')
    `);
    await queryRunner.query(`
      CREATE TABLE "counselor_case" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "triggerType" "counselor_case_trigger_type_enum" NOT NULL,
        "triggerSummary" text NOT NULL,
        "status" "counselor_case_status_enum" NOT NULL DEFAULT 'open',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "closedAt" timestamptz,
        "closedByStaffId" uuid
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "counselor_case"`);
    await queryRunner.query(`DROP TYPE "counselor_case_status_enum"`);
    await queryRunner.query(`DROP TYPE "counselor_case_trigger_type_enum"`);
  }
}
