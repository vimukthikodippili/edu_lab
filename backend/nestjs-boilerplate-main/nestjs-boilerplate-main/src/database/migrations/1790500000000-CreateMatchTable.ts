import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchTable1790500000000 implements MigrationInterface {
  name = 'CreateMatchTable1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."match_type_enum" AS ENUM('friendly', 'inter_school', 'tournament', 'internal')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_team_result_enum" AS ENUM('win', 'loss', 'draw', 'no_result')`,
    );

    await queryRunner.query(`
      CREATE TABLE "match" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sportId" uuid NOT NULL,
        "date" date NOT NULL,
        "opponent" character varying,
        "venue" character varying NOT NULL,
        "matchType" "public"."match_type_enum" NOT NULL,
        "teamResult" "public"."match_team_result_enum" NOT NULL DEFAULT 'no_result',
        "teamScore" character varying,
        "notes" text,
        "loggedByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_match_sport" FOREIGN KEY ("sportId")
          REFERENCES "sport" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_match_logged_by_staff" FOREIGN KEY ("loggedByStaffId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "match"`);
    await queryRunner.query(`DROP TYPE "public"."match_team_result_enum"`);
    await queryRunner.query(`DROP TYPE "public"."match_type_enum"`);
  }
}
