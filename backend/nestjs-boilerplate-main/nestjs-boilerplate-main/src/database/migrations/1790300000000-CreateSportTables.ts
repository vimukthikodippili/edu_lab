import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSportTables1790300000000 implements MigrationInterface {
  name = 'CreateSportTables1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sport_type_enum" AS ENUM(
        'cricket', 'football', 'volleyball', 'basketball', 'netball',
        'athletics_track', 'athletics_field', 'badminton', 'table_tennis',
        'swimming', 'rugger', 'chess', 'carom'
      )`,
    );

    await queryRunner.query(`
      CREATE TABLE "sport" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "sportType" "public"."sport_type_enum" NOT NULL,
        "seasonStart" date NOT NULL,
        "seasonEnd" date NOT NULL,
        "description" text,
        "coachId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_sport_coach" FOREIGN KEY ("coachId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sport_enrollment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sportId" uuid NOT NULL,
        "studentId" uuid NOT NULL,
        "enrolledAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_sport_enrollment_sport_student" UNIQUE ("sportId", "studentId"),
        CONSTRAINT "FK_sport_enrollment_sport" FOREIGN KEY ("sportId")
          REFERENCES "sport" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sport_enrollment_student" FOREIGN KEY ("studentId")
          REFERENCES "student" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sport_metric" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sportType" "public"."sport_type_enum" NOT NULL,
        "metricName" character varying NOT NULL,
        "unit" character varying,
        "isTimeBased" boolean NOT NULL DEFAULT false,
        "isDistanceBased" boolean NOT NULL DEFAULT false,
        "ordering" integer NOT NULL,
        CONSTRAINT "UQ_sport_metric_type_name" UNIQUE ("sportType", "metricName")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sport_metric"`);
    await queryRunner.query(`DROP TABLE "sport_enrollment"`);
    await queryRunner.query(`DROP TABLE "sport"`);
    await queryRunner.query(`DROP TYPE "public"."sport_type_enum"`);
  }
}
