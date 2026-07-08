import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassDiaryEntry1785900000000 implements MigrationInterface {
  name = 'CreateClassDiaryEntry1785900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "class_diary_entry" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "timetableEntryId" integer NOT NULL REFERENCES "timetable_entry"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "notes" text,
        "attachmentFileIds" jsonb NOT NULL DEFAULT '[]',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("timetableEntryId", "date")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "class_diary_entry"`);
  }
}
