import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentMatchPerformanceTable1790600000000
  implements MigrationInterface
{
  name = 'CreateStudentMatchPerformanceTable1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."student_match_performance_status_enum" AS ENUM('draft', 'submitted')`,
    );

    await queryRunner.query(`
      CREATE TABLE "student_match_performance" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "matchId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "metricValues" jsonb NOT NULL DEFAULT '{}',
        "personalBests" jsonb NOT NULL DEFAULT '{}',
        "status" "public"."student_match_performance_status_enum" NOT NULL DEFAULT 'draft',
        "submittedAt" timestamptz,
        "adminOverrideGranted" boolean NOT NULL DEFAULT false,
        "adminOverrideGrantedByStaffId" uuid,
        "adminOverrideGrantedAt" timestamptz,
        "enteredByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_student_match_performance_match_student" UNIQUE ("matchId", "studentId"),
        CONSTRAINT "FK_smp_match" FOREIGN KEY ("matchId")
          REFERENCES "match" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_smp_student" FOREIGN KEY ("studentId")
          REFERENCES "student" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_smp_entered_by_staff" FOREIGN KEY ("enteredByStaffId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_smp_override_granted_by_staff" FOREIGN KEY ("adminOverrideGrantedByStaffId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "student_match_performance"`);
    await queryRunner.query(`DROP TYPE "public"."student_match_performance_status_enum"`);
  }
}
