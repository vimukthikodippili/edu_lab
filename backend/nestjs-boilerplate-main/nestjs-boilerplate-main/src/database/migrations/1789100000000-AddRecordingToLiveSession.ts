import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecordingToLiveSession1789100000000
  implements MigrationInterface
{
  name = 'AddRecordingToLiveSession1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "live_session_recordingstatus_enum" AS ENUM (
        'not_started', 'recording', 'processing', 'available', 'failed'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "live_session"
        ADD COLUMN "egressId" varchar,
        ADD COLUMN "recordingUrl" varchar,
        ADD COLUMN "recordingStatus" "live_session_recordingstatus_enum" NOT NULL DEFAULT 'not_started'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "live_session"
        DROP COLUMN "egressId",
        DROP COLUMN "recordingUrl",
        DROP COLUMN "recordingStatus"
    `);
    await queryRunner.query(`DROP TYPE "live_session_recordingstatus_enum"`);
  }
}
