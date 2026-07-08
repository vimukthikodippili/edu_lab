import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyllabusUnitTable1785600000000 implements MigrationInterface {
  name = 'CreateSyllabusUnitTable1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "syllabus_unit" (
        "id"           uuid          NOT NULL DEFAULT gen_random_uuid(),
        "subjectId"    uuid          NOT NULL,
        "gradeId"      int           NOT NULL,
        "title"        varchar(255)  NOT NULL,
        "description"  varchar(1000),
        "order"        smallint      NOT NULL,
        "academicYear" varchar(4)    NOT NULL,
        "createdAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_syllabus_unit" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_syllabus_unit_order"
          UNIQUE ("subjectId", "gradeId", "academicYear", "order"),
        CONSTRAINT "FK_syllabus_unit_subject"
          FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_syllabus_unit_grade"
          FOREIGN KEY ("gradeId") REFERENCES "grade"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_syllabus_unit_lookup"
        ON "syllabus_unit" ("subjectId", "gradeId", "academicYear")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_syllabus_unit_lookup"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "syllabus_unit"`);
  }
}
