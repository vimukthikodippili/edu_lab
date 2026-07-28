import { MigrationInterface, QueryRunner } from 'typeorm';

/** MHA-121 — encrypts DomainResult.counselorNotes at the application layer (AES-256-GCM,
 * dedicated DOMAIN_RESULT_NOTE_ENCRYPTION_KEY, isolated from COUNSELOR_NOTE_ENCRYPTION_KEY).
 * Per settled decision: drops the plaintext column outright and recreates as three nullable
 * ciphertext columns — existing dev-only plaintext rows are not migrated/backfilled. */
export class EncryptDomainResultCounselorNotes1792800000000
  implements MigrationInterface
{
  name = 'EncryptDomainResultCounselorNotes1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domain_result" DROP COLUMN "counselorNotes"`);
    await queryRunner.query(
      `ALTER TABLE "domain_result" ADD COLUMN "counselorNotesCiphertext" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "domain_result" ADD COLUMN "counselorNotesIv" varchar(24)`,
    );
    await queryRunner.query(
      `ALTER TABLE "domain_result" ADD COLUMN "counselorNotesAuthTag" varchar(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "domain_result" DROP COLUMN "counselorNotesAuthTag"`);
    await queryRunner.query(`ALTER TABLE "domain_result" DROP COLUMN "counselorNotesIv"`);
    await queryRunner.query(`ALTER TABLE "domain_result" DROP COLUMN "counselorNotesCiphertext"`);
    await queryRunner.query(`ALTER TABLE "domain_result" ADD COLUMN "counselorNotes" text`);
  }
}
