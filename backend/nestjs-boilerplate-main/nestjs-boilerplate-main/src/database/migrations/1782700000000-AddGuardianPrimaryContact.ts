import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardianPrimaryContact1782700000000 implements MigrationInterface {
  name = 'AddGuardianPrimaryContact1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add isPrimaryContact to the junction table (NOT NULL, default false)
    await queryRunner.query(
      `ALTER TABLE "student_guardian" ADD COLUMN "isPrimaryContact" boolean NOT NULL DEFAULT false`,
    );

    // 2. DB-level constraint: at most one primary contact per student
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_student_guardian_one_primary"
       ON "student_guardian" ("studentId")
       WHERE "isPrimaryContact" = TRUE`,
    );

    // 3. Add ID-proof file reference on guardian (nullable FK → file table)
    await queryRunner.query(
      `ALTER TABLE "guardian" ADD COLUMN "idProofFileId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "guardian"
       ADD CONSTRAINT "FK_guardian_idProof"
       FOREIGN KEY ("idProofFileId") REFERENCES "file"("id") ON DELETE SET NULL`,
    );

    // 4. Backfill: for each student, mark the alphabetically-first guardian as primary.
    //    This is a no-op on a clean install (no students enrolled yet) but ensures
    //    the partial unique index constraint is satisfied if the DB already has data.
    await queryRunner.query(
      `UPDATE "student_guardian" sg
       SET    "isPrimaryContact" = TRUE
       WHERE  sg."guardianId" = (
         SELECT  sg2."guardianId"
         FROM    "student_guardian" sg2
         JOIN    "guardian" g ON g.id = sg2."guardianId"
         WHERE   sg2."studentId" = sg."studentId"
         ORDER   BY g."firstName" ASC, g."lastName" ASC
         LIMIT   1
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "guardian" DROP CONSTRAINT "FK_guardian_idProof"`);
    await queryRunner.query(`ALTER TABLE "guardian" DROP COLUMN "idProofFileId"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_student_guardian_one_primary"`);
    await queryRunner.query(`ALTER TABLE "student_guardian" DROP COLUMN "isPrimaryContact"`);
  }
}
