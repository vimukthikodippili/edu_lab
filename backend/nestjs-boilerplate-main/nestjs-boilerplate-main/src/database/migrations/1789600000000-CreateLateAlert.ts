import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLateAlert1789600000000 implements MigrationInterface {
  name = 'CreateLateAlert1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "late_alert" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "timetableEntryId" int NOT NULL,
        "date" date NOT NULL,
        "minutesLate" int NOT NULL,
        "acknowledgedAt" timestamptz,
        "acknowledgedByStaffId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_late_alert_entry_date" UNIQUE ("timetableEntryId", "date"),
        CONSTRAINT "FK_late_alert_timetable_entry" FOREIGN KEY ("timetableEntryId")
          REFERENCES "timetable_entry" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "late_alert"`);
  }
}
