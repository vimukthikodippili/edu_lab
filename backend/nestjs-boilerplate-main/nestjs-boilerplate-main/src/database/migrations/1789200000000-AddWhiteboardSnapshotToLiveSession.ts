import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhiteboardSnapshotToLiveSession1789200000000
  implements MigrationInterface
{
  name = 'AddWhiteboardSnapshotToLiveSession1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "live_session"
        ADD COLUMN "whiteboardSnapshotFileId" uuid,
        ADD COLUMN "whiteboardSnapshotPdfFileId" uuid,
        ADD CONSTRAINT "FK_live_session_whiteboardSnapshotFileId"
          FOREIGN KEY ("whiteboardSnapshotFileId") REFERENCES "file"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_live_session_whiteboardSnapshotPdfFileId"
          FOREIGN KEY ("whiteboardSnapshotPdfFileId") REFERENCES "file"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "live_session"
        DROP CONSTRAINT "FK_live_session_whiteboardSnapshotFileId",
        DROP CONSTRAINT "FK_live_session_whiteboardSnapshotPdfFileId",
        DROP COLUMN "whiteboardSnapshotFileId",
        DROP COLUMN "whiteboardSnapshotPdfFileId"
    `);
  }
}
