import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCounselorNote1788100000000 implements MigrationInterface {
  name = 'CreateCounselorNote1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "counselor_note" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "caseId" uuid,
        "counselorStaffId" uuid NOT NULL,
        "ciphertext" text NOT NULL,
        "iv" varchar(24) NOT NULL,
        "authTag" varchar(32) NOT NULL,
        "approvedSummary" text,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "counselor_note"`);
  }
}
