import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSectionHeadGradeRangeToStaff1789500000000
  implements MigrationInterface
{
  name = 'AddSectionHeadGradeRangeToStaff1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff"
      ADD COLUMN "sectionHeadGradeFrom" int,
      ADD COLUMN "sectionHeadGradeTo" int
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff"
      DROP COLUMN "sectionHeadGradeFrom",
      DROP COLUMN "sectionHeadGradeTo"
    `);
  }
}
