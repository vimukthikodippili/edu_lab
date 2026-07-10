import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentDocument1787300000000 implements MigrationInterface {
  name = 'CreateStudentDocument1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "student"
      ADD COLUMN "leavingReason" varchar(500) NULL
    `);

    await queryRunner.query(`
      CREATE TYPE "student_document_type_enum" AS ENUM (
        'character_certificate', 'leaving_report'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "student_document" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "type" "student_document_type_enum" NOT NULL,
        "fileId" uuid NOT NULL REFERENCES "file"("id") ON DELETE CASCADE,
        "issuedByUserId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "student_document"`);
    await queryRunner.query(`DROP TYPE "student_document_type_enum"`);
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN "leavingReason"`);
  }
}
