import { MigrationInterface, QueryRunner } from 'typeorm';

/** P5-EH — Examination Hall Management (Phase 5). Bundles all 5 new tables in one migration,
 * mirroring `CreateEventTables.ts`'s "related tables land together" convention. No FK
 * constraints — matches this codebase's established bare-uuid-column convention for
 * MHA/Event-family child rows (services do their own manual joins). */
export class CreateExamHallTables1794000000000 implements MigrationInterface {
  name = 'CreateExamHallTables1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "exam_type" AS ENUM (
        'term_test', 'monthly_test', 'scholarship', 'o_level', 'a_level', 'mock_ol', 'mock_al', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "exam" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "examType" exam_type NOT NULL,
        "subjectId" uuid NOT NULL,
        "gradeId" int NOT NULL,
        "date" date NOT NULL,
        "startTime" varchar NOT NULL,
        "endTime" varchar NOT NULL,
        "academicYear" varchar NOT NULL,
        "createdByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "exam_hall" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "building" varchar,
        "floor" varchar,
        "capacity" int NOT NULL,
        "rowCount" int NOT NULL,
        "columnCount" int NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "exam_seat" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "examHallId" uuid NOT NULL,
        "seatLabel" varchar NOT NULL,
        "rowNumber" int NOT NULL,
        "columnNumber" int NOT NULL,
        CONSTRAINT "UQ_exam_seat_hall_label" UNIQUE ("examHallId", "seatLabel")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exam_seat_hall" ON "exam_seat" ("examHallId")
    `);

    await queryRunner.query(`
      CREATE TABLE "exam_seat_allocation" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "examId" uuid NOT NULL,
        "examHallId" uuid NOT NULL,
        "examSeatId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "specialNeeds" boolean NOT NULL DEFAULT false,
        "allocatedAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_exam_seat_allocation_exam_student" UNIQUE ("examId", "studentId"),
        CONSTRAINT "UQ_exam_seat_allocation_exam_seat" UNIQUE ("examId", "examSeatId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exam_seat_allocation_exam" ON "exam_seat_allocation" ("examId")
    `);

    await queryRunner.query(`
      CREATE TABLE "admit_card" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "examSeatAllocationId" uuid NOT NULL UNIQUE,
        "generatedAt" timestamptz NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admit_card"`);
    await queryRunner.query(`DROP TABLE "exam_seat_allocation"`);
    await queryRunner.query(`DROP TABLE "exam_seat"`);
    await queryRunner.query(`DROP TABLE "exam_hall"`);
    await queryRunner.query(`DROP TABLE "exam"`);
    await queryRunner.query(`DROP TYPE "exam_type"`);
  }
}
