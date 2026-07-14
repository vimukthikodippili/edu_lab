import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaterialsCheckToAssessment1788400000000
  implements MigrationInterface
{
  name = 'AddMaterialsCheckToAssessment1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assessment"
      ADD COLUMN "requiresMaterialsCheck" boolean NOT NULL DEFAULT false,
      ADD COLUMN "instructions" text
    `);

    await queryRunner.query(`
      CREATE TABLE "assessment_materials_check" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "assessmentId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "hasFullMaterials" boolean NOT NULL,
        "note" varchar(500),
        "checkedByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_amc_assessment_student" UNIQUE ("assessmentId", "studentId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assessment_materials_check"`);
    await queryRunner.query(`
      ALTER TABLE "assessment"
      DROP COLUMN "requiresMaterialsCheck",
      DROP COLUMN "instructions"
    `);
  }
}
