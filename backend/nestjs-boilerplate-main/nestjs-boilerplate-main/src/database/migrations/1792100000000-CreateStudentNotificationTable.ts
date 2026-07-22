import { MigrationInterface, QueryRunner } from 'typeorm';

/** A new student-facing notification channel — this codebase had only staff and guardian
 * notification tables before this story (confirmed via research). Mirrors guardian_notification
 * exactly. No FK on studentId (matches guardian_notification's own FK-less staffId/guardianId
 * columns — notifications are a log, not a strict referential child of the student). */
export class CreateStudentNotificationTable1792100000000 implements MigrationInterface {
  name = 'CreateStudentNotificationTable1792100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "student_notification" (
        "id" SERIAL PRIMARY KEY,
        "studentId" uuid NOT NULL,
        "title" character varying(120) NOT NULL,
        "message" text NOT NULL,
        "type" character varying(40) NOT NULL,
        "metadata" jsonb,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_student_notification_studentId_createdAt"
        ON "student_notification" ("studentId", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_student_notification_studentId_createdAt"`);
    await queryRunner.query(`DROP TABLE "student_notification"`);
  }
}
