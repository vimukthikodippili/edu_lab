import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubstituteAssignmentTable1785200000000
  implements MigrationInterface
{
  name = 'CreateSubstituteAssignmentTable1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "substitute_assignment" (
        "id"                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "leaveRequestId"         UUID         NOT NULL
          REFERENCES "leave_request"("id") ON DELETE RESTRICT,
        "absentTeacherId"        UUID         NOT NULL
          REFERENCES "staff"("id") ON DELETE RESTRICT,
        "classSectionId"         INT          NOT NULL
          REFERENCES "class_section"("id") ON DELETE RESTRICT,
        "subjectId"              UUID         NOT NULL
          REFERENCES "subject"("id") ON DELETE RESTRICT,
        "academicYear"           VARCHAR(4)   NOT NULL,
        "day"                    SMALLINT     NOT NULL,
        "period"                 SMALLINT     NOT NULL,
        "suggestedSubstituteId"  UUID
          REFERENCES "staff"("id") ON DELETE SET NULL,
        "assignedSubstituteId"   UUID
          REFERENCES "staff"("id") ON DELETE SET NULL,
        "status"                 VARCHAR(20)  NOT NULL DEFAULT 'suggested',
        "assignedById"           UUID
          REFERENCES "staff"("id") ON DELETE SET NULL,
        "assignedAt"             TIMESTAMPTZ,
        "createdAt"              TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"              TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sub_assign_leaveRequestId"
        ON "substitute_assignment" ("leaveRequestId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sub_assign_status"
        ON "substitute_assignment" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sub_assign_absentTeacher"
        ON "substitute_assignment" ("absentTeacherId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sub_assign_absentTeacher"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sub_assign_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sub_assign_leaveRequestId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "substitute_assignment"`);
  }
}
