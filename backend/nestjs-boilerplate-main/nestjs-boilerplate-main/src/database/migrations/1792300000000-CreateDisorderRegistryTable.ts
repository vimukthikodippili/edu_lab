import { MigrationInterface, QueryRunner } from 'typeorm';

/** Module 12 (MHA) Foundation, MHA-110 — Disorder/Test Registry (SRS Addendum §12.3). Brand-new
 * table, no legacy enum/column to migrate off; seeding of the 21 domains happens via the
 * disorder-registry seed service, not inline here. */
export class CreateDisorderRegistryTable1792300000000 implements MigrationInterface {
  name = 'CreateDisorderRegistryTable1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE disorder_section AS ENUM (
          'educational_disorders', 'emotional_mental_health', 'addiction_assessments',
          'school_academic_problems', 'social_problems', 'lifestyle_assessments'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE disorder_risk_category AS ENUM (
          'academic_risk', 'learning_disability_risk', 'emotional_risk', 'behavioral_risk',
          'social_risk', 'addiction_risk', 'health_lifestyle_risk'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE "disorder_registry" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "name" character varying NOT NULL,
        "section" disorder_section NOT NULL,
        "riskCategory" disorder_risk_category NOT NULL,
        "ageMin" integer NOT NULL,
        "ageMax" integer NOT NULL,
        "symptoms" jsonb NOT NULL DEFAULT '[]',
        "tests" jsonb NOT NULL DEFAULT '[]',
        "safetyFlag" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_disorder_registry_code" UNIQUE ("code")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "disorder_registry"`);
    await queryRunner.query(`DROP TYPE "disorder_risk_category"`);
    await queryRunner.query(`DROP TYPE "disorder_section"`);
  }
}
