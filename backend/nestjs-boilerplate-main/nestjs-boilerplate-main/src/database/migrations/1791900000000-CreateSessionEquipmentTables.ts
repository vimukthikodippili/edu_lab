import { MigrationInterface, QueryRunner } from 'typeorm';

/** Session-level equipment usage logging + immutable damage/missing reports (SRS Section 4.2).
 * `equipment_damage_report` additionally gets a real Postgres trigger rejecting UPDATE/DELETE
 * outright — this codebase's dominant convention for "append-only" is simply never wiring up an
 * update/delete route (see equipment_condition_history, equipment_write_off), but this story
 * explicitly calls for *enforced* append-only, and one precedent for real DB-level enforcement
 * already exists (class_check_in's own trigger, migration 1789300000000) — mirrored here
 * verbatim rather than inventing a new mechanism. */
export class CreateSessionEquipmentTables1791900000000 implements MigrationInterface {
  name = 'CreateSessionEquipmentTables1791900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "session_equipment_usage" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "labBookingId" uuid NOT NULL,
        "equipmentId" uuid NOT NULL,
        "quantityUsed" integer NOT NULL,
        "submittedById" uuid NOT NULL,
        "submittedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_session_equipment_usage_booking" FOREIGN KEY ("labBookingId")
          REFERENCES "lab_booking" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_session_equipment_usage_equipment" FOREIGN KEY ("equipmentId")
          REFERENCES "equipment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_session_equipment_usage_staff" FOREIGN KEY ("submittedById")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_session_equipment_usage_booking" ON "session_equipment_usage" ("labBookingId")
    `);

    await queryRunner.query(`
      CREATE TABLE "equipment_damage_report" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "labBookingId" uuid NOT NULL,
        "equipmentId" uuid NOT NULL,
        "reportType" character varying NOT NULL,
        "quantity" integer NOT NULL,
        "responsibleStudentId" uuid,
        "notes" text,
        "reportedById" uuid NOT NULL,
        "reportedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_equipment_damage_report_booking" FOREIGN KEY ("labBookingId")
          REFERENCES "lab_booking" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_damage_report_equipment" FOREIGN KEY ("equipmentId")
          REFERENCES "equipment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_damage_report_student" FOREIGN KEY ("responsibleStudentId")
          REFERENCES "student" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_equipment_damage_report_staff" FOREIGN KEY ("reportedById")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_equipment_damage_report_booking" ON "equipment_damage_report" ("labBookingId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_equipment_damage_report_equipment" ON "equipment_damage_report" ("equipmentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_equipment_damage_report_reported_at" ON "equipment_damage_report" ("reportedAt")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_equipment_damage_report_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'equipment_damage_report records are append-only and cannot be updated or deleted';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER equipment_damage_report_immutable
      BEFORE UPDATE OR DELETE ON "equipment_damage_report"
      FOR EACH ROW EXECUTE FUNCTION prevent_equipment_damage_report_mutation()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS equipment_damage_report_immutable ON "equipment_damage_report"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS prevent_equipment_damage_report_mutation()`,
    );
    await queryRunner.query(`DROP INDEX "IDX_equipment_damage_report_reported_at"`);
    await queryRunner.query(`DROP INDEX "IDX_equipment_damage_report_equipment"`);
    await queryRunner.query(`DROP INDEX "IDX_equipment_damage_report_booking"`);
    await queryRunner.query(`DROP TABLE "equipment_damage_report"`);
    await queryRunner.query(`DROP INDEX "IDX_session_equipment_usage_booking"`);
    await queryRunner.query(`DROP TABLE "session_equipment_usage"`);
  }
}
