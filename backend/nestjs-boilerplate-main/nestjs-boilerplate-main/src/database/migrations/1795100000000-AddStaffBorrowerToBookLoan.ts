import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffBorrowerToBookLoan1795100000000
  implements MigrationInterface
{
  name = 'AddStaffBorrowerToBookLoan1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "book_loan" ALTER COLUMN "studentId" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "book_loan" ADD COLUMN IF NOT EXISTS "borrowerStaffId" UUID
        REFERENCES "staff"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_book_loan_borrowerStaffId"
        ON "book_loan" ("borrowerStaffId")
    `);

    await queryRunner.query(`
      ALTER TABLE "book_loan" ADD CONSTRAINT "CHK_book_loan_borrower"
        CHECK ((("studentId" IS NOT NULL)::int + ("borrowerStaffId" IS NOT NULL)::int) = 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "book_loan" DROP CONSTRAINT IF EXISTS "CHK_book_loan_borrower"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_book_loan_borrowerStaffId"`);
    await queryRunner.query(`ALTER TABLE "book_loan" DROP COLUMN IF EXISTS "borrowerStaffId"`);
    await queryRunner.query(`ALTER TABLE "book_loan" ALTER COLUMN "studentId" SET NOT NULL`);
  }
}
