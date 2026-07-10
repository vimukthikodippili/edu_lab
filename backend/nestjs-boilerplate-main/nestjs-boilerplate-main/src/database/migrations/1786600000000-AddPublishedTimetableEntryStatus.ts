import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublishedTimetableEntryStatus1786600000000
  implements MigrationInterface
{
  name = 'AddPublishedTimetableEntryStatus1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "timetable_entry_status_enum" ADD VALUE 'published'
    `);
  }

  public async down(): Promise<void> {
    // Postgres does not support removing enum values; down migration is a no-op.
  }
}
