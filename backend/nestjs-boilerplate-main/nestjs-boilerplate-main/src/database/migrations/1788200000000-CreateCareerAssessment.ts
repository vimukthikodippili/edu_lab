import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCareerAssessment1788200000000 implements MigrationInterface {
  name = 'CreateCareerAssessment1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "career_assessment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" integer NOT NULL,
        "oceanAnswers" jsonb,
        "oceanScores" jsonb,
        "riasecAnswers" jsonb,
        "riasecScores" jsonb,
        "riasecSuggestions" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "career_assessment"`);
  }
}
