import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStaffTables1782800000000 implements MigrationInterface {
  name = 'CreateStaffTables1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums must exist before tables reference them
    await queryRunner.query(
      `CREATE TYPE "staff_status_enum" AS ENUM ('active', 'on_leave', 'resigned', 'retired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "staff_functional_role_enum" AS ENUM (
        'subject_teacher', 'class_teacher', 'sports_coach', 'society_supervisor',
        'exam_coordinator', 'lab_instructor', 'librarian', 'counselor',
        'accountant', 'security', 'admin_officer', 'other'
      )`,
    );

    // Main staff table
    await queryRunner.query(`
      CREATE TABLE "staff" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeNumber" character varying NOT NULL,
        "firstName"      character varying NOT NULL,
        "lastName"       character varying NOT NULL,
        "designation"    character varying NOT NULL,
        "department"     character varying NOT NULL,
        "startDate"      date NOT NULL,
        "email"          character varying NOT NULL,
        "phone"          character varying NOT NULL,
        "nicNumber"      character varying NOT NULL,
        "address"        character varying,
        "qualifications" jsonb NOT NULL DEFAULT '[]',
        "status"         "staff_status_enum" NOT NULL DEFAULT 'active',
        "photoId"        uuid,
        "createdAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt"      TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_staff" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_staff_employeeNumber" UNIQUE ("employeeNumber"),
        CONSTRAINT "UQ_staff_email" UNIQUE ("email"),
        CONSTRAINT "UQ_staff_nicNumber" UNIQUE ("nicNumber"),
        CONSTRAINT "FK_staff_photo"
          FOREIGN KEY ("photoId") REFERENCES "file"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_staff_department" ON "staff" ("department")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_staff_designation" ON "staff" ("designation")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_staff_status" ON "staff" ("status") WHERE "deletedAt" IS NULL`,
    );

    // Junction table — composite PK prevents duplicate role assignments per staff member
    await queryRunner.query(`
      CREATE TABLE "staff_role_assignment" (
        "staffId" uuid NOT NULL,
        "role"    "staff_functional_role_enum" NOT NULL,
        CONSTRAINT "PK_staff_role_assignment" PRIMARY KEY ("staffId", "role"),
        CONSTRAINT "FK_staff_role_assignment_staff"
          FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "staff_role_assignment"`);
    await queryRunner.query(`DROP INDEX "IDX_staff_status"`);
    await queryRunner.query(`DROP INDEX "IDX_staff_designation"`);
    await queryRunner.query(`DROP INDEX "IDX_staff_department"`);
    await queryRunner.query(`DROP TABLE "staff"`);
    await queryRunner.query(`DROP TYPE "staff_functional_role_enum"`);
    await queryRunner.query(`DROP TYPE "staff_status_enum"`);
  }
}
