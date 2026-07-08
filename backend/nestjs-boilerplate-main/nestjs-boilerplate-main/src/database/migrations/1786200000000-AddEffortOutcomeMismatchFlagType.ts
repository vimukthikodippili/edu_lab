import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEffortOutcomeMismatchFlagType1786200000000
  implements MigrationInterface
{
  name = 'AddEffortOutcomeMismatchFlagType1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "academic_pattern_flag_type_enum" ADD VALUE 'effort_outcome_mismatch'
    `);
  }

  public async down(): Promise<void> {
    // Postgres does not support removing enum values; down migration is a no-op.
    // A full rollback would require recreating the enum type and the dependent column.
  }
}
