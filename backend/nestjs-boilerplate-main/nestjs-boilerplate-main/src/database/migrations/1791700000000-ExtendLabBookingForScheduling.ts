import { MigrationInterface, QueryRunner } from 'typeorm';

/** Evolves the minimal lab_booking stub (date + period + who booked it) into full Lab
 * Scheduling: conflict detection, cancellation, recurring bookings, and timetable linkage.
 * `classSectionId`/`subjectId`/`timetableEntryId` are nullable at the DB level only because one
 * real dev-DB QA booking row already exists from the prior story's live testing and predates
 * these columns — it is left in place (not deleted or backfilled with fabricated data). The DTO
 * enforces these as required for every new booking going forward. */
export class ExtendLabBookingForScheduling1791700000000 implements MigrationInterface {
  name = 'ExtendLabBookingForScheduling1791700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lab_booking" RENAME COLUMN "period" TO "periodNumber"`);
    await queryRunner.query(`ALTER TABLE "lab_booking" RENAME COLUMN "bookedByStaffId" TO "teacherId"`);
    await queryRunner.query(
      `ALTER TABLE "lab_booking" RENAME CONSTRAINT "FK_lab_booking_staff" TO "FK_lab_booking_teacher"`,
    );

    await queryRunner.query(`
      ALTER TABLE "lab_booking"
      ADD "timetableEntryId" integer,
      ADD "classSectionId" integer,
      ADD "subjectId" uuid,
      ADD "status" character varying NOT NULL DEFAULT 'confirmed',
      ADD "cancelledAt" timestamptz,
      ADD "cancelledByStaffId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "lab_booking"
      ADD CONSTRAINT "FK_lab_booking_timetable_entry" FOREIGN KEY ("timetableEntryId")
        REFERENCES "timetable_entry" ("id") ON DELETE SET NULL,
      ADD CONSTRAINT "FK_lab_booking_class_section" FOREIGN KEY ("classSectionId")
        REFERENCES "class_section" ("id") ON DELETE RESTRICT,
      ADD CONSTRAINT "FK_lab_booking_subject" FOREIGN KEY ("subjectId")
        REFERENCES "subject" ("id") ON DELETE RESTRICT,
      ADD CONSTRAINT "FK_lab_booking_cancelled_by_staff" FOREIGN KEY ("cancelledByStaffId")
        REFERENCES "staff" ("id") ON DELETE RESTRICT
    `);

    // Defense-in-depth backstop alongside the application-level 409 check — cancelled bookings
    // don't hold the slot, so only one CONFIRMED booking may exist per lab+date+period.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_lab_booking_lab_date_period_confirmed"
        ON "lab_booking" ("labId", "date", "periodNumber")
        WHERE "status" = 'confirmed'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_lab_booking_lab_date_period_confirmed"`);

    await queryRunner.query(`
      ALTER TABLE "lab_booking"
      DROP CONSTRAINT "FK_lab_booking_cancelled_by_staff",
      DROP CONSTRAINT "FK_lab_booking_subject",
      DROP CONSTRAINT "FK_lab_booking_class_section",
      DROP CONSTRAINT "FK_lab_booking_timetable_entry"
    `);

    await queryRunner.query(`
      ALTER TABLE "lab_booking"
      DROP COLUMN "cancelledByStaffId",
      DROP COLUMN "cancelledAt",
      DROP COLUMN "status",
      DROP COLUMN "subjectId",
      DROP COLUMN "classSectionId",
      DROP COLUMN "timetableEntryId"
    `);

    await queryRunner.query(
      `ALTER TABLE "lab_booking" RENAME CONSTRAINT "FK_lab_booking_teacher" TO "FK_lab_booking_staff"`,
    );
    await queryRunner.query(`ALTER TABLE "lab_booking" RENAME COLUMN "teacherId" TO "bookedByStaffId"`);
    await queryRunner.query(`ALTER TABLE "lab_booking" RENAME COLUMN "periodNumber" TO "period"`);
  }
}
