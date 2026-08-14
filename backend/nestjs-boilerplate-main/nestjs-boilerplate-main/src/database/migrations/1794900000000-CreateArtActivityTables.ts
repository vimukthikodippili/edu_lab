import { MigrationInterface, QueryRunner } from 'typeorm';

/** Class Teacher art/painting color-check — before-activity "does every student have all
 * their colors" and after-activity "which colors did each student use", one row per
 * student per activity. No FK constraints — matches the established bare-uuid-column
 * convention used throughout PTM/Events/Exam-Hall (services do their own joins). */
export class CreateArtActivityTables1794900000000 implements MigrationInterface {
  name = 'CreateArtActivityTables1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "art_activity" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "classSectionId" int NOT NULL,
        "activityDate" date NOT NULL,
        "title" varchar(150) NOT NULL DEFAULT 'Painting Activity',
        "createdByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_art_activity_class_section" ON "art_activity" ("classSectionId")`);

    await queryRunner.query(`
      CREATE TABLE "art_activity_student_check" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "artActivityId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "hasAllColors" boolean,
        "colorsUsed" text[],
        "checkedByStaffId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_aasc_activity_student" UNIQUE ("artActivityId", "studentId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "art_activity_student_check"`);
    await queryRunner.query(`DROP TABLE "art_activity"`);
  }
}
