import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoachAlertTable1791000000000 implements MigrationInterface {
  name = 'CreateCoachAlertTable1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."coach_alert_alert_type_enum" AS ENUM('declining_trend')`,
    );

    await queryRunner.query(`
      CREATE TABLE "coach_alert" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL,
        "sportId" uuid NOT NULL,
        "metricName" character varying NOT NULL,
        "alertType" "public"."coach_alert_alert_type_enum" NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_coach_alert_student" FOREIGN KEY ("studentId")
          REFERENCES "student" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coach_alert_sport" FOREIGN KEY ("sportId")
          REFERENCES "sport" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "coach_alert"`);
    await queryRunner.query(`DROP TYPE "public"."coach_alert_alert_type_enum"`);
  }
}
