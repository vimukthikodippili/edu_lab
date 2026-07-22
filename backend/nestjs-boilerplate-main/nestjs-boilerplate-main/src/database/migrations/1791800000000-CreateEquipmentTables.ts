import { MigrationInterface, QueryRunner } from 'typeorm';

/** Equipment & Inventory Management (Lab Management SRS Section 4.1) — a lab's master equipment
 * inventory, managed by its Lab In-Charge: registration, condition tracking with history,
 * write-offs, and configurable-per-lab-type categories. Brand-new tables, no ALTERs needed. */
export class CreateEquipmentTables1791800000000 implements MigrationInterface {
  name = 'CreateEquipmentTables1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "equipment_category" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "labTypeId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_equipment_category_lab_type" FOREIGN KEY ("labTypeId")
          REFERENCES "lab_type" ("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_equipment_category_lab_type_name" UNIQUE ("labTypeId", "name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "labId" uuid NOT NULL,
        "name" character varying(120) NOT NULL,
        "categoryId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit" character varying(30) NOT NULL,
        "condition" character varying NOT NULL DEFAULT 'good',
        "serialNumber" character varying(120),
        "purchaseDate" date NOT NULL,
        "minStockLevel" integer,
        "lowStockNotifiedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_equipment_lab" FOREIGN KEY ("labId")
          REFERENCES "lab" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_category" FOREIGN KEY ("categoryId")
          REFERENCES "equipment_category" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_equipment_lab" ON "equipment" ("labId")`);

    await queryRunner.query(`
      CREATE TABLE "equipment_condition_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "equipmentId" uuid NOT NULL,
        "previousCondition" character varying NOT NULL,
        "newCondition" character varying NOT NULL,
        "changedById" uuid NOT NULL,
        "changedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_equipment_condition_history_equipment" FOREIGN KEY ("equipmentId")
          REFERENCES "equipment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_condition_history_staff" FOREIGN KEY ("changedById")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_equipment_condition_history_equipment" ON "equipment_condition_history" ("equipmentId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "equipment_write_off" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "equipmentId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "reason" text NOT NULL,
        "writtenOffById" uuid NOT NULL,
        "writtenOffAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_equipment_write_off_equipment" FOREIGN KEY ("equipmentId")
          REFERENCES "equipment" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipment_write_off_staff" FOREIGN KEY ("writtenOffById")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_equipment_write_off_equipment" ON "equipment_write_off" ("equipmentId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_equipment_write_off_equipment"`);
    await queryRunner.query(`DROP TABLE "equipment_write_off"`);
    await queryRunner.query(`DROP INDEX "IDX_equipment_condition_history_equipment"`);
    await queryRunner.query(`DROP TABLE "equipment_condition_history"`);
    await queryRunner.query(`DROP INDEX "IDX_equipment_lab"`);
    await queryRunner.query(`DROP TABLE "equipment"`);
    await queryRunner.query(`DROP TABLE "equipment_category"`);
  }
}
