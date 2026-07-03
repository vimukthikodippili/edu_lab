import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublishingToTermResult1784200000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "term_result"
        ADD COLUMN IF NOT EXISTS "isPublished"     BOOLEAN     NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "publishedAt"      TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "reportCardFileId"  UUID
    `);

    await queryRunner.query(`
      ALTER TABLE "term_result"
        ADD CONSTRAINT "FK_term_result_report_card_file"
        FOREIGN KEY ("reportCardFileId") REFERENCES "file"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_term_result_published"
        ON "term_result" ("classSectionId", "termId", "isPublished")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_term_result_published"`);
    await queryRunner.query(`
      ALTER TABLE "term_result" DROP CONSTRAINT IF EXISTS "FK_term_result_report_card_file"
    `);
    await queryRunner.query(`
      ALTER TABLE "term_result"
        DROP COLUMN IF EXISTS "reportCardFileId",
        DROP COLUMN IF EXISTS "publishedAt",
        DROP COLUMN IF EXISTS "isPublished"
    `);
  }
}
