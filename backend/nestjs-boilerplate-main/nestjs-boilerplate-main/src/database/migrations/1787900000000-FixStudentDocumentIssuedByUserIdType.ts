import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixStudentDocumentIssuedByUserIdType1787900000000
  implements MigrationInterface
{
  name = 'FixStudentDocumentIssuedByUserIdType1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_document" DROP COLUMN "issuedByUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_document" ADD COLUMN "issuedByUserId" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_document" DROP COLUMN "issuedByUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_document" ADD COLUMN "issuedByUserId" uuid`,
    );
  }
}
