import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBehavioralObservation1787400000000
  implements MigrationInterface
{
  name = 'CreateBehavioralObservation1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "behavioral_observation" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "studentId" uuid NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
        "authorStaffId" uuid NOT NULL,
        "notes" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "behavioral_observation"`);
  }
}
