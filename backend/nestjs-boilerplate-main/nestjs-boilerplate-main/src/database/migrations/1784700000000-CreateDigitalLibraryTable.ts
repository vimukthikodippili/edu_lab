import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDigitalLibraryTable1784700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "digital_book" (
        "id"               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "title"            VARCHAR(255)  NOT NULL,
        "author"           VARCHAR(255)  NOT NULL,
        "subject"          VARCHAR(100),
        "description"      TEXT,
        "fileId"           UUID          NOT NULL
          REFERENCES "file"("id") ON DELETE RESTRICT,
        "uploadedByUserId" INT           NOT NULL
          REFERENCES "user"("id") ON DELETE RESTRICT,
        "uploaderName"     VARCHAR(255)  NOT NULL,
        "isApproved"       BOOLEAN       NOT NULL DEFAULT false,
        "createdAt"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMPTZ   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_book_approved"
        ON "digital_book" ("isApproved")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_digital_book_uploader"
        ON "digital_book" ("uploadedByUserId")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_digital_book_uploader"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_digital_book_approved"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "digital_book"`);
  }
}
