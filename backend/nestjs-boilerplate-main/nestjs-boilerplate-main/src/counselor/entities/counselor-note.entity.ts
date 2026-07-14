import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity({ name: 'counselor_note' })
export class CounselorNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  // Optionally links to the CounselorCaseEntity that prompted this session, if any —
  // a note is fundamentally about a student, not necessarily tied to a specific case.
  @Column({ type: 'uuid', nullable: true })
  caseId: string | null;

  @Column({ type: 'uuid' })
  counselorStaffId: string;

  // @Exclude() ensures these never leak via serialization even if accidentally returned —
  // same defense-in-depth pattern as BiometricVaultEntity's encrypted columns.
  @Exclude()
  @Column({ type: 'text' })
  ciphertext: string;

  @Exclude()
  @Column({ type: 'varchar', length: 24 })
  iv: string;

  @Exclude()
  @Column({ type: 'varchar', length: 32 })
  authTag: string;

  // Plain text, unencrypted, independently nullable — the counselor authors this fresh
  // as an explicit opt-in share; it is never derived by decrypting the raw note above.
  @Column({ type: 'text', nullable: true })
  approvedSummary: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
