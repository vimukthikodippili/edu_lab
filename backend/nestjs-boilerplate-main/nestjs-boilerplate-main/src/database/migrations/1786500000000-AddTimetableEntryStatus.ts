import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimetableEntryStatus1786500000000 implements MigrationInterface {
  name = 'AddTimetableEntryStatus1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "timetable_entry_status_enum" AS ENUM ('draft', 'confirmed')
    `);
    await queryRunner.query(`
      ALTER TABLE "timetable_entry"
      ADD COLUMN "status" "timetable_entry_status_enum" NOT NULL DEFAULT 'confirmed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "timetable_entry" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "timetable_entry_status_enum"`);
  }
}
