import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-EH-2 — Invigilator Assignment (Phase 5). No FK constraints — matches this module's
 * established bare-uuid-column convention (services do their own manual joins). */
export class CreateExamInvigilatorTable1794100000000 implements MigrationInterface {
  name = 'CreateExamInvigilatorTable1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exam_invigilator" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "examId" uuid NOT NULL,
        "examHallId" uuid NOT NULL,
        "staffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_exam_invigilator_exam_hall_staff" UNIQUE ("examId", "examHallId", "staffId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exam_invigilator_exam" ON "exam_invigilator" ("examId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exam_invigilator"`);
  }
}
