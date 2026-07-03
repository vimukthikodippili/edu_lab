import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAttendanceTables1783600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "school_holiday" (
        "id"          SERIAL PRIMARY KEY,
        "date"        DATE NOT NULL,
        "description" varchar(200) NOT NULL,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sh_date" UNIQUE ("date")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "attendance_record_status_enum"
        AS ENUM ('present', 'absent', 'late', 'excused', 'medical')
    `);

    await queryRunner.query(`
      CREATE TABLE "attendance_record" (
        "id"             uuid NOT NULL DEFAULT gen_random_uuid(),
        "studentId"      uuid NOT NULL,
        "classSectionId" integer NOT NULL,
        "date"           DATE NOT NULL,
        "status"         "attendance_record_status_enum" NOT NULL,
        "note"           varchar(500),
        "markedById"     uuid NOT NULL,
        "overrideReason" varchar(500),
        "createdAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ar" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ar_student_date" UNIQUE ("studentId", "date"),
        CONSTRAINT "FK_ar_student"
          FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ar_class_section"
          FOREIGN KEY ("classSectionId") REFERENCES "class_section"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ar_marked_by"
          FOREIGN KEY ("markedById") REFERENCES "staff"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ar_class_date"
        ON "attendance_record" ("classSectionId", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attendance_record"`);
    await queryRunner.query(`DROP TYPE "attendance_record_status_enum"`);
    await queryRunner.query(`DROP TABLE "school_holiday"`);
  }
}
