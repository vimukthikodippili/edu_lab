import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLibraryTables1784600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE book_status AS ENUM ('available', 'damaged', 'lost');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE loan_status AS ENUM ('active', 'returned', 'overdue');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "book" (
        "id"             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "isbn"           VARCHAR(20)   NOT NULL,
        "barcode"        VARCHAR(50)   NOT NULL,
        "title"          VARCHAR(255)  NOT NULL,
        "author"         VARCHAR(255)  NOT NULL,
        "publisher"      VARCHAR(255),
        "publishYear"    INT,
        "subject"        VARCHAR(100),
        "gradeLevel"     VARCHAR(50),
        "category"       VARCHAR(100),
        "location"       VARCHAR(100),
        "totalCopies"    INT           NOT NULL DEFAULT 1,
        "availableCopies" INT          NOT NULL DEFAULT 1,
        "status"         book_status   NOT NULL DEFAULT 'available',
        "createdAt"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_book_isbn"    UNIQUE ("isbn"),
        CONSTRAINT "UQ_book_barcode" UNIQUE ("barcode")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "book_loan" (
        "id"                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "bookId"             UUID         NOT NULL
          REFERENCES "book"("id") ON DELETE CASCADE,
        "studentId"          UUID         NOT NULL
          REFERENCES "student"("id") ON DELETE CASCADE,
        "issuedByStaffId"    UUID         NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "returnedByStaffId"  UUID
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "issuedAt"           TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "dueAt"              TIMESTAMPTZ  NOT NULL,
        "returnedAt"         TIMESTAMPTZ,
        "fineAmount"         NUMERIC(10,2),
        "finePaid"           BOOLEAN      NOT NULL DEFAULT false,
        "status"             loan_status  NOT NULL DEFAULT 'active',
        "createdAt"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_book_loan_book"
        ON "book_loan" ("bookId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_book_loan_student"
        ON "book_loan" ("studentId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_book_loan_status"
        ON "book_loan" ("status")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_book_loan_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_book_loan_student"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_book_loan_book"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "book_loan"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "book"`);
    await queryRunner.query(`DROP TYPE IF EXISTS loan_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS book_status`);
  }
}
