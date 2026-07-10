import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMoodCheckIn1787600000000 implements MigrationInterface {
  name = 'CreateMoodCheckIn1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mood_check_in" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "moodValue" smallint NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_mood_check_in_mood_value_range" CHECK ("moodValue" BETWEEN 1 AND 5),
        UNIQUE ("studentId", "date")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mood_check_in"`);
  }
}
