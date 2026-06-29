import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInAppNotificationTable1783500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "in_app_notification" (
        "id"        SERIAL PRIMARY KEY,
        "staffId"   uuid NOT NULL,
        "title"     varchar(120) NOT NULL,
        "message"   text NOT NULL,
        "type"      varchar(40) NOT NULL,
        "isRead"    boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_ian_staff"
          FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ian_staff_read" ON "in_app_notification" ("staffId", "isRead")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "in_app_notification"`);
  }
}
