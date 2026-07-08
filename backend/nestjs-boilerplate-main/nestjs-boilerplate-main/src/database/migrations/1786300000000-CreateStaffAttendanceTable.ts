import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStaffAttendanceTable1786300000000
  implements MigrationInterface
{
  name = 'CreateStaffAttendanceTable1786300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "staff_attendance_status_enum" AS ENUM (
        'present', 'absent', 'late', 'half_day', 'on_leave'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "staff_attendance" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "staffId" uuid NOT NULL,
        "date" date NOT NULL,
        "status" "staff_attendance_status_enum" NOT NULL,
        "markedById" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("staffId", "date")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "staff_attendance"`);
    await queryRunner.query(`DROP TYPE "staff_attendance_status_enum"`);
  }
}
