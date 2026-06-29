import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubjectTables1782900000000 implements MigrationInterface {
  name = 'CreateSubjectTables1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Categories — configurable lookup table (never a hardcoded enum)
    await queryRunner.query(`
      CREATE TABLE "subject_category" (
        "id"          SERIAL PRIMARY KEY,
        "name"        character varying NOT NULL,
        "description" character varying,
        "color"       character varying NOT NULL DEFAULT '#6c757d',
        "isActive"    boolean NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    // Case-insensitive uniqueness on category name
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_subject_category_name" ON "subject_category" (LOWER("name"))`,
    );

    // Seed SRS-specified default categories
    await queryRunner.query(`
      INSERT INTO "subject_category" ("name", "color") VALUES
        ('Core',        '#0d6efd'),
        ('Language',    '#198754'),
        ('Optional',    '#fd7e14'),
        ('Aesthetics',  '#6610f2'),
        ('Science',     '#0dcaf0'),
        ('Commerce',    '#ffc107'),
        ('Technology',  '#20c997'),
        ('Religion',    '#dc3545')
    `);

    // Subjects — school-level definitions, no grade FK at this stage
    await queryRunner.query(`
      CREATE TABLE "subject" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code"        character varying NOT NULL,
        "name"        character varying NOT NULL,
        "description" character varying,
        "categoryId"  integer NOT NULL,
        "isActive"    boolean NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subject" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subject_category"
          FOREIGN KEY ("categoryId") REFERENCES "subject_category"("id")
      )
    `);

    // Case-insensitive unique code (prevents MAT vs mat collision)
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_subject_code" ON "subject" (UPPER("code"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subject_categoryId" ON "subject" ("categoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subject_isActive" ON "subject" ("isActive")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_subject_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_subject_categoryId"`);
    await queryRunner.query(`DROP INDEX "UQ_subject_code"`);
    await queryRunner.query(`DROP TABLE "subject"`);
    await queryRunner.query(`DROP INDEX "UQ_subject_category_name"`);
    await queryRunner.query(`DROP TABLE "subject_category"`);
  }
}
