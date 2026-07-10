import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassCheckIn1786800000000 implements MigrationInterface {
  name = 'CreateClassCheckIn1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "class_check_in_method_enum" AS ENUM ('pwa_tap', 'qr_scan', 'live_session_auto')
    `);
    await queryRunner.query(`
      CREATE TABLE "class_check_in" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "timetableEntryId" int NOT NULL,
        "date" date NOT NULL,
        "teacherId" uuid NOT NULL,
        "checkedInAt" timestamptz NOT NULL DEFAULT now(),
        "method" "class_check_in_method_enum" NOT NULL DEFAULT 'pwa_tap',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_class_check_in_entry_date" UNIQUE ("timetableEntryId", "date"),
        CONSTRAINT "FK_class_check_in_timetable_entry" FOREIGN KEY ("timetableEntryId")
          REFERENCES "timetable_entry" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "class_check_in"`);
    await queryRunner.query(`DROP TYPE "class_check_in_method_enum"`);
  }
}
