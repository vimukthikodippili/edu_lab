import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassTeacherToClassSection1787000000000
  implements MigrationInterface
{
  name = 'AddClassTeacherToClassSection1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "class_section"
      ADD COLUMN "classTeacherStaffId" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "class_section" DROP COLUMN "classTeacherStaffId"`,
    );
  }
}
