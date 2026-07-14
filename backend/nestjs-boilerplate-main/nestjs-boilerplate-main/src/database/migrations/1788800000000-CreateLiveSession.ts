import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLiveSession1788800000000 implements MigrationInterface {
  name = 'CreateLiveSession1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "live_session" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "classSectionId" integer NOT NULL,
        "subjectId" uuid NOT NULL,
        "title" varchar,
        "scheduledAt" timestamptz NOT NULL,
        "durationMinutes" integer NOT NULL DEFAULT 40,
        "joinUrl" varchar NOT NULL,
        "createdByTeacherId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_live_session_class_section" ON "live_session" ("classSectionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "live_session"`);
  }
}
