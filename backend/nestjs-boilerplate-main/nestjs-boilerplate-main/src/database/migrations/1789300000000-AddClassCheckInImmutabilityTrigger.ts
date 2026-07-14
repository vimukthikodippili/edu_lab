import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClassCheckInImmutabilityTrigger1789300000000
  implements MigrationInterface
{
  name = 'AddClassCheckInImmutabilityTrigger1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_class_check_in_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'class_check_in records are append-only and cannot be updated or deleted';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER class_check_in_immutable
      BEFORE UPDATE OR DELETE ON "class_check_in"
      FOR EACH ROW EXECUTE FUNCTION prevent_class_check_in_mutation()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS class_check_in_immutable ON "class_check_in"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS prevent_class_check_in_mutation()`,
    );
  }
}
