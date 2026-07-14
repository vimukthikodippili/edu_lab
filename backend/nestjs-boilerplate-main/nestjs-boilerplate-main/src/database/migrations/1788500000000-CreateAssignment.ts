import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssignment1788500000000 implements MigrationInterface {
  name = 'CreateAssignment1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assignment" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "classSectionId" integer NOT NULL,
        "subjectId" uuid NOT NULL,
        "title" varchar NOT NULL,
        "instructions" text NOT NULL,
        "dueDate" date NOT NULL,
        "attachmentFileIds" jsonb NOT NULL DEFAULT '[]',
        "createdByTeacherId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_assignment_class_section" ON "assignment" ("classSectionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assignment"`);
  }
}
