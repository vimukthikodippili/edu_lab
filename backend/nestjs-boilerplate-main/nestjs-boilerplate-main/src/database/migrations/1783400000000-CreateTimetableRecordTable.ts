import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTimetableRecordTable1783400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "timetable_record" (
        "id"           SERIAL PRIMARY KEY,
        "academicYear" varchar(4) NOT NULL,
        "isLocked"     boolean NOT NULL DEFAULT false,
        "finalizedAt"  TIMESTAMP WITH TIME ZONE,
        "finalizedBy"  uuid,
        "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tr_year" UNIQUE ("academicYear")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "timetable_record"`);
  }
}
