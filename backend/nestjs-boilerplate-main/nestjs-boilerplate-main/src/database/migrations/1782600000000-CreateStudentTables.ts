import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStudentTables1782600000000 implements MigrationInterface {
  name = 'CreateStudentTables1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."grade_stage_enum" AS ENUM('primary', 'junior_secondary', 'senior_secondary', 'collegiate')`,
    );
    await queryRunner.query(
      `CREATE TABLE "grade" (
        "id" SERIAL NOT NULL,
        "level" integer NOT NULL,
        "name" character varying NOT NULL,
        "stage" "public"."grade_stage_enum" NOT NULL,
        CONSTRAINT "UQ_grade_level" UNIQUE ("level"),
        CONSTRAINT "PK_grade" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "class_section" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "academicYear" character varying NOT NULL,
        "gradeId" integer NOT NULL,
        CONSTRAINT "PK_class_section" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_section_grade_year" ON "class_section" ("gradeId", "academicYear")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."guardian_relationship_enum" AS ENUM('father', 'mother', 'sibling', 'uncle', 'aunt', 'grandparent', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guardian" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "relationship" "public"."guardian_relationship_enum" NOT NULL,
        "nic" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "email" character varying,
        "address" character varying,
        "biometricEnrolled" boolean NOT NULL DEFAULT false,
        "isBlacklisted" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_guardian" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."student_gender_enum" AS ENUM('male', 'female', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_status_enum" AS ENUM('active', 'transferred', 'graduated', 'withdrawn')`,
    );
    await queryRunner.query(
      `CREATE TABLE "student" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "admissionNumber" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "dateOfBirth" date NOT NULL,
        "gender" "public"."student_gender_enum" NOT NULL,
        "address" character varying,
        "contactNumber" character varying,
        "nicNumber" character varying,
        "medicalNotes" text,
        "academicYear" character varying NOT NULL,
        "status" "public"."student_status_enum" NOT NULL DEFAULT 'active',
        "qrCode" text,
        "gradeId" integer NOT NULL,
        "classSectionId" integer NOT NULL,
        "photoId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "UQ_student_admissionNumber" UNIQUE ("admissionNumber"),
        CONSTRAINT "PK_student" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_student_admissionNumber" ON "student" ("admissionNumber")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_student_name" ON "student" ("firstName", "lastName")`,
    );

    await queryRunner.query(
      `CREATE TABLE "student_guardian" (
        "studentId" uuid NOT NULL,
        "guardianId" uuid NOT NULL,
        CONSTRAINT "PK_student_guardian" PRIMARY KEY ("studentId", "guardianId")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_student_guardian_student" ON "student_guardian" ("studentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_student_guardian_guardian" ON "student_guardian" ("guardianId")`,
    );

    // Foreign keys
    await queryRunner.query(
      `ALTER TABLE "class_section" ADD CONSTRAINT "FK_class_section_grade" FOREIGN KEY ("gradeId") REFERENCES "grade"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student" ADD CONSTRAINT "FK_student_grade" FOREIGN KEY ("gradeId") REFERENCES "grade"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student" ADD CONSTRAINT "FK_student_classSection" FOREIGN KEY ("classSectionId") REFERENCES "class_section"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student" ADD CONSTRAINT "FK_student_photo" FOREIGN KEY ("photoId") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardian" ADD CONSTRAINT "FK_student_guardian_student" FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardian" ADD CONSTRAINT "FK_student_guardian_guardian" FOREIGN KEY ("guardianId") REFERENCES "guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "student_guardian" DROP CONSTRAINT "FK_student_guardian_guardian"`);
    await queryRunner.query(`ALTER TABLE "student_guardian" DROP CONSTRAINT "FK_student_guardian_student"`);
    await queryRunner.query(`ALTER TABLE "student" DROP CONSTRAINT "FK_student_photo"`);
    await queryRunner.query(`ALTER TABLE "student" DROP CONSTRAINT "FK_student_classSection"`);
    await queryRunner.query(`ALTER TABLE "student" DROP CONSTRAINT "FK_student_grade"`);
    await queryRunner.query(`ALTER TABLE "class_section" DROP CONSTRAINT "FK_class_section_grade"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_student_guardian_guardian"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_student_guardian_student"`);
    await queryRunner.query(`DROP TABLE "student_guardian"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_student_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_student_admissionNumber"`);
    await queryRunner.query(`DROP TABLE "student"`);
    await queryRunner.query(`DROP TYPE "public"."student_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."student_gender_enum"`);
    await queryRunner.query(`DROP TABLE "guardian"`);
    await queryRunner.query(`DROP TYPE "public"."guardian_relationship_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_class_section_grade_year"`);
    await queryRunner.query(`DROP TABLE "class_section"`);
    await queryRunner.query(`DROP TABLE "grade"`);
    await queryRunner.query(`DROP TYPE "public"."grade_stage_enum"`);
  }
}
