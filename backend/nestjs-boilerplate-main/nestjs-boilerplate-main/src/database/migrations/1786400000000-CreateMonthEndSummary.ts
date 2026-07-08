import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMonthEndSummary1786400000000 implements MigrationInterface {
  name = 'CreateMonthEndSummary1786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "month_end_summary" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "staffId" uuid NOT NULL,
        "subjectId" uuid NOT NULL,
        "gradeId" int NOT NULL,
        "academicYear" varchar(4) NOT NULL,
        "month" int NOT NULL,
        "plannedCount" int NOT NULL,
        "completedCount" int NOT NULL,
        "incompleteItems" jsonb NOT NULL DEFAULT '[]',
        "generatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("staffId", "subjectId", "academicYear", "month")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "month_end_summary"`);
  }
}
