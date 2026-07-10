import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClassRoom1786900000000 implements MigrationInterface {
  name = 'CreateClassRoom1786900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "class_room" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "roomNumber" varchar(50) NOT NULL UNIQUE,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "class_room"`);
  }
}
