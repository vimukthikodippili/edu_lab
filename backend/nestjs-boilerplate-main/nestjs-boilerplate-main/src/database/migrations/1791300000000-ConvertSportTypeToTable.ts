import { MigrationInterface, QueryRunner } from 'typeorm';

/** Converts SportType from a fixed Postgres enum into a real, runtime-writable table — an
 * Admin/Principal can now add a new sport type (e.g. Karate) without a code change. Sequence:
 * create the table (with a transient legacy_code column used only for this migration's own
 * backfill join), seed the 13 original types, add sportTypeId FK columns to sport/sport_metric,
 * backfill by joining the old enum value to legacy_code, drop the old enum columns + type +
 * legacy_code. */
export class ConvertSportTypeToTable1791300000000 implements MigrationInterface {
  name = 'ConvertSportTypeToTable1791300000000';

  private readonly seedRows: { code: string; name: string; personalBestEligible: boolean }[] = [
    { code: 'cricket', name: 'Cricket', personalBestEligible: false },
    { code: 'football', name: 'Football (Soccer)', personalBestEligible: false },
    { code: 'volleyball', name: 'Volleyball', personalBestEligible: false },
    { code: 'basketball', name: 'Basketball', personalBestEligible: false },
    { code: 'netball', name: 'Netball', personalBestEligible: false },
    { code: 'athletics_track', name: 'Athletics — Track', personalBestEligible: true },
    { code: 'athletics_field', name: 'Athletics — Field', personalBestEligible: true },
    { code: 'badminton', name: 'Badminton', personalBestEligible: false },
    { code: 'table_tennis', name: 'Table Tennis', personalBestEligible: false },
    { code: 'swimming', name: 'Swimming', personalBestEligible: true },
    { code: 'rugger', name: 'Rugger (Rugby)', personalBestEligible: false },
    { code: 'chess', name: 'Chess', personalBestEligible: false },
    { code: 'carom', name: 'Carom', personalBestEligible: false },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sport_type" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL UNIQUE,
        "isPersonalBestEligible" boolean NOT NULL DEFAULT false,
        "legacy_code" character varying,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const row of this.seedRows) {
      await queryRunner.query(
        `INSERT INTO "sport_type" ("name", "isPersonalBestEligible", "legacy_code") VALUES ($1, $2, $3)`,
        [row.name, row.personalBestEligible, row.code],
      );
    }

    // sport
    await queryRunner.query(`ALTER TABLE "sport" ADD "sportTypeId" uuid`);
    await queryRunner.query(`
      UPDATE "sport" s SET "sportTypeId" = st.id
      FROM "sport_type" st WHERE st."legacy_code" = s."sportType"::text
    `);
    await queryRunner.query(`ALTER TABLE "sport" ALTER COLUMN "sportTypeId" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "sport" ADD CONSTRAINT "FK_sport_sport_type" FOREIGN KEY ("sportTypeId")
        REFERENCES "sport_type" ("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`ALTER TABLE "sport" DROP COLUMN "sportType"`);

    // sport_metric
    await queryRunner.query(`ALTER TABLE "sport_metric" DROP CONSTRAINT "UQ_sport_metric_type_name"`);
    await queryRunner.query(`ALTER TABLE "sport_metric" ADD "sportTypeId" uuid`);
    await queryRunner.query(`
      UPDATE "sport_metric" sm SET "sportTypeId" = st.id
      FROM "sport_type" st WHERE st."legacy_code" = sm."sportType"::text
    `);
    await queryRunner.query(`ALTER TABLE "sport_metric" ALTER COLUMN "sportTypeId" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "sport_metric" ADD CONSTRAINT "FK_sport_metric_sport_type" FOREIGN KEY ("sportTypeId")
        REFERENCES "sport_type" ("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "sport_metric" ADD CONSTRAINT "UQ_sport_metric_type_name" UNIQUE ("sportTypeId", "metricName")
    `);
    await queryRunner.query(`ALTER TABLE "sport_metric" DROP COLUMN "sportType"`);

    // Cleanup
    await queryRunner.query(`ALTER TABLE "sport_type" DROP COLUMN "legacy_code"`);
    await queryRunner.query(`DROP TYPE "public"."sport_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sport_type_enum" AS ENUM(
        'cricket', 'football', 'volleyball', 'basketball', 'netball',
        'athletics_track', 'athletics_field', 'badminton', 'table_tennis',
        'swimming', 'rugger', 'chess', 'carom'
      )`,
    );

    // Best-effort: reconstructs the enum value from sport_type.name via the same seed mapping —
    // only correct if names haven't been renamed by an admin since this migration ran, and any
    // sport type added after this migration has no enum equivalent to roll back to.
    await queryRunner.query(`ALTER TABLE "sport" ADD "sportType" "public"."sport_type_enum"`);
    await queryRunner.query(`ALTER TABLE "sport_metric" ADD "sportType" "public"."sport_type_enum"`);
    for (const row of this.seedRows) {
      await queryRunner.query(
        `UPDATE "sport" s SET "sportType" = $1::"public"."sport_type_enum"
         FROM "sport_type" st WHERE st.id = s."sportTypeId" AND st.name = $2`,
        [row.code, row.name],
      );
      await queryRunner.query(
        `UPDATE "sport_metric" sm SET "sportType" = $1::"public"."sport_type_enum"
         FROM "sport_type" st WHERE st.id = sm."sportTypeId" AND st.name = $2`,
        [row.code, row.name],
      );
    }
    await queryRunner.query(`ALTER TABLE "sport" ALTER COLUMN "sportType" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "sport_metric" ALTER COLUMN "sportType" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "sport" DROP CONSTRAINT "FK_sport_sport_type"`);
    await queryRunner.query(`ALTER TABLE "sport" DROP COLUMN "sportTypeId"`);
    await queryRunner.query(`ALTER TABLE "sport_metric" DROP CONSTRAINT "UQ_sport_metric_type_name"`);
    await queryRunner.query(`ALTER TABLE "sport_metric" DROP CONSTRAINT "FK_sport_metric_sport_type"`);
    await queryRunner.query(`ALTER TABLE "sport_metric" DROP COLUMN "sportTypeId"`);
    await queryRunner.query(
      `ALTER TABLE "sport_metric" ADD CONSTRAINT "UQ_sport_metric_type_name" UNIQUE ("sportType", "metricName")`,
    );

    await queryRunner.query(`DROP TABLE "sport_type"`);
  }
}
