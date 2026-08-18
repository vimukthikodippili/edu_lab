import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromotionRecommendationTable1795600000000
  implements MigrationInterface
{
  name = 'CreatePromotionRecommendationTable1795600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "promotion_recommendation_outcome_enum" AS ENUM (
        'promote', 'repeat', 'graduate'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "promotion_recommendation" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "academicYear" varchar(4) NOT NULL,
        "classSectionId" integer NOT NULL REFERENCES "class_section"("id") ON DELETE RESTRICT,
        "recommendedById" uuid NOT NULL REFERENCES "staff"("id") ON DELETE RESTRICT,
        "outcome" "promotion_recommendation_outcome_enum" NOT NULL,
        "comment" varchar(500),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_promotion_recommendation_student_year" UNIQUE ("studentId", "academicYear")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_promotion_recommendation_year_section"
        ON "promotion_recommendation" ("academicYear", "classSectionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_promotion_recommendation_year_section"`,
    );
    await queryRunner.query(`DROP TABLE "promotion_recommendation"`);
    await queryRunner.query(`DROP TYPE "promotion_recommendation_outcome_enum"`);
  }
}
