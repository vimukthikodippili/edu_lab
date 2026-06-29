import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnrollmentTables1783000000000 implements MigrationInterface {
  name = 'CreateEnrollmentTables1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A/L Streams — configurable lookup table, never a hardcoded enum
    await queryRunner.query(`
      CREATE TABLE "al_stream" (
        "id"          SERIAL PRIMARY KEY,
        "name"        character varying NOT NULL,
        "description" character varying,
        "isActive"    boolean NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_al_stream_name" ON "al_stream" (LOWER("name"))`,
    );

    // Seed SRS-specified default A/L streams
    await queryRunner.query(`
      INSERT INTO "al_stream" ("name", "description") VALUES
        ('Biology',    'Bio Science stream (Biology, Chemistry, Physics)'),
        ('Maths',      'Maths stream (Combined Maths, Physics, Chemistry)'),
        ('Commerce',   'Commerce stream (Accounting, Business Studies, Economics)'),
        ('Technology', 'Technology stream (Engineering Technology, Science for Technology)'),
        ('Arts',       'Arts stream (Sinhala Literature, History, Political Science)')
    `);

    // Stream default subject combinations (pre-populates student enrollment on stream assignment)
    await queryRunner.query(`
      CREATE TABLE "al_stream_subject" (
        "streamId"  integer NOT NULL,
        "subjectId" uuid    NOT NULL,
        CONSTRAINT "PK_al_stream_subject" PRIMARY KEY ("streamId", "subjectId"),
        CONSTRAINT "FK_al_stream_subject_stream"
          FOREIGN KEY ("streamId")  REFERENCES "al_stream"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_al_stream_subject_subject"
          FOREIGN KEY ("subjectId") REFERENCES "subject"("id")   ON DELETE CASCADE
      )
    `);

    // Per-student subject enrollment — one row per student+subject, structurally independent per student
    await queryRunner.query(`
      CREATE TABLE "student_subject_enrollment" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentId"  uuid NOT NULL,
        "subjectId"  uuid NOT NULL,
        "enrolledAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_student_subject_enrollment" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_enrollment_student_subject" UNIQUE ("studentId", "subjectId"),
        CONSTRAINT "FK_enrollment_student"
          FOREIGN KEY ("studentId") REFERENCES "student"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_enrollment_subject"
          FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_enrollment_studentId" ON "student_subject_enrollment" ("studentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_enrollment_subjectId" ON "student_subject_enrollment" ("subjectId")`,
    );

    // Add nullable streamId to student table (service layer enforces collegiate-only rule)
    await queryRunner.query(`ALTER TABLE "student" ADD COLUMN "streamId" integer`);
    await queryRunner.query(`
      ALTER TABLE "student"
        ADD CONSTRAINT "FK_student_stream"
        FOREIGN KEY ("streamId") REFERENCES "al_stream"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_student_streamId" ON "student" ("streamId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_student_streamId"`);
    await queryRunner.query(`ALTER TABLE "student" DROP CONSTRAINT "FK_student_stream"`);
    await queryRunner.query(`ALTER TABLE "student" DROP COLUMN "streamId"`);
    await queryRunner.query(`DROP INDEX "IDX_enrollment_subjectId"`);
    await queryRunner.query(`DROP INDEX "IDX_enrollment_studentId"`);
    await queryRunner.query(`DROP TABLE "student_subject_enrollment"`);
    await queryRunner.query(`DROP TABLE "al_stream_subject"`);
    await queryRunner.query(`DROP INDEX "UQ_al_stream_name"`);
    await queryRunner.query(`DROP TABLE "al_stream"`);
  }
}
