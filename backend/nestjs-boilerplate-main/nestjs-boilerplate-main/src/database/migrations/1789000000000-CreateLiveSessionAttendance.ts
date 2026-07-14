import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLiveSessionAttendance1789000000000
  implements MigrationInterface
{
  name = 'CreateLiveSessionAttendance1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "live_session_attendance" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "liveSessionId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "joinedAt" timestamptz NOT NULL,
        "leftAt" timestamptz,
        "durationSeconds" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_lsa_live_session" FOREIGN KEY ("liveSessionId")
          REFERENCES "live_session"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lsa_student" FOREIGN KEY ("studentId")
          REFERENCES "student"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_lsa_session_student" ON "live_session_attendance" ("liveSessionId", "studentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "live_session_attendance"`);
  }
}
