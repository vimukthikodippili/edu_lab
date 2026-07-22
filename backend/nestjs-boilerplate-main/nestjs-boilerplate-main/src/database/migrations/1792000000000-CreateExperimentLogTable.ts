import { MigrationInterface, QueryRunner } from 'typeorm';

/** One experiment log per lab session (SRS Section 5, FR-P3-ER-01/02). Mirrors class_diary_entry's
 * shape/attachment convention closely, but keyed by a single labBookingId (a LabBooking already
 * represents one real session, unlike a weekly-recurring TimetableEntry) rather than a
 * (timetableEntryId, date) pair. */
export class CreateExperimentLogTable1792000000000 implements MigrationInterface {
  name = 'CreateExperimentLogTable1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "experiment_log" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "labBookingId" uuid NOT NULL,
        "experimentName" character varying(200) NOT NULL,
        "objective" text NOT NULL,
        "procedureSummary" text NOT NULL,
        "outcome" text NOT NULL,
        "attachmentFileIds" jsonb NOT NULL DEFAULT '[]',
        "loggedById" uuid NOT NULL,
        "loggedAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_experiment_log_booking" UNIQUE ("labBookingId"),
        CONSTRAINT "FK_experiment_log_booking" FOREIGN KEY ("labBookingId")
          REFERENCES "lab_booking" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_experiment_log_staff" FOREIGN KEY ("loggedById")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "experiment_log"`);
  }
}
