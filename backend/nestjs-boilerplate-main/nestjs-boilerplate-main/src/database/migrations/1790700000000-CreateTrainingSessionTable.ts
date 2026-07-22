import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTrainingSessionTable1790700000000 implements MigrationInterface {
  name = 'CreateTrainingSessionTable1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "training_session" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "sportId" uuid NOT NULL,
        "date" date NOT NULL,
        "description" text NOT NULL,
        "attendeeStudentIds" jsonb NOT NULL DEFAULT '[]',
        "sessionLeaderStudentId" uuid,
        "loggedByStaffId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_training_session_sport" FOREIGN KEY ("sportId")
          REFERENCES "sport" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_training_session_leader_student" FOREIGN KEY ("sessionLeaderStudentId")
          REFERENCES "student" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_training_session_logged_by_staff" FOREIGN KEY ("loggedByStaffId")
          REFERENCES "staff" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "training_session"`);
  }
}
