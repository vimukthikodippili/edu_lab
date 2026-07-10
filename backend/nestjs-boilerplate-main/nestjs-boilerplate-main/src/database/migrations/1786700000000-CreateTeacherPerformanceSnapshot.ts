import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeacherPerformanceSnapshot1786700000000
  implements MigrationInterface
{
  name = 'CreateTeacherPerformanceSnapshot1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teacher_performance_snapshot" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "staffId" uuid NOT NULL,
        "weekStartDate" date NOT NULL,
        "academicYear" varchar(4) NOT NULL,
        "syllabusCompletionPercent" double precision NOT NULL,
        "plannedCompletionPercent" double precision NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("staffId", "weekStartDate")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "teacher_performance_snapshot"`);
  }
}
