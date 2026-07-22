import { MigrationInterface, QueryRunner } from 'typeorm';

/** Registers school labs/specialist rooms (Science, Computer, Language, Art, and
 * school-defined custom types) with a type, capacity, room number, and an assigned Lab
 * In-Charge — plus a minimal booking stub (date + period, no conflict detection) just
 * sufficient to back a live availability badge and enforce "maintenance blocks bookings."
 * Brand-new tables, no enum-to-table conversion needed. */
export class CreateLabTables1791600000000 implements MigrationInterface {
  name = 'CreateLabTables1791600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lab_type" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL UNIQUE,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "lab" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "labTypeId" uuid NOT NULL,
        "capacity" integer NOT NULL,
        "roomNumber" character varying(50) NOT NULL,
        "labInChargeId" uuid NOT NULL,
        "isUnderMaintenance" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_lab_lab_type" FOREIGN KEY ("labTypeId")
          REFERENCES "lab_type" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_lab_lab_in_charge" FOREIGN KEY ("labInChargeId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "lab_booking" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "labId" uuid NOT NULL,
        "date" date NOT NULL,
        "period" smallint NOT NULL,
        "bookedByStaffId" uuid NOT NULL,
        "purpose" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_lab_booking_lab" FOREIGN KEY ("labId")
          REFERENCES "lab" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_lab_booking_staff" FOREIGN KEY ("bookedByStaffId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_lab_booking_lab_date" ON "lab_booking" ("labId", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_lab_booking_lab_date"`);
    await queryRunner.query(`DROP TABLE "lab_booking"`);
    await queryRunner.query(`DROP TABLE "lab"`);
    await queryRunner.query(`DROP TABLE "lab_type"`);
  }
}
