import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CounselorNoteEntity } from './entities/counselor-note.entity';
import { CounselorNoteCryptoService } from './counselor-note-crypto.service';

export interface DecryptedCounselorNote {
  id: string;
  studentId: string;
  caseId: string | null;
  counselorStaffId: string;
  notes: string;
  approvedSummary: string | null;
  createdAt: Date;
}

export interface ApprovedSummaryRow {
  id: string;
  studentId: string;
  approvedSummary: string;
  createdAt: Date;
}

@Injectable()
export class CounselorNoteService {
  constructor(
    @InjectRepository(CounselorNoteEntity)
    private readonly noteRepo: Repository<CounselorNoteEntity>,

    private readonly cryptoService: CounselorNoteCryptoService,
  ) {}

  async create(
    studentId: string,
    counselorStaffId: string,
    notes: string,
    caseId: string | null,
  ): Promise<DecryptedCounselorNote> {
    const { ciphertext, iv, authTag } = this.cryptoService.encrypt(notes);
    const saved = await this.noteRepo.save(
      this.noteRepo.create({
        studentId,
        caseId,
        counselorStaffId,
        ciphertext,
        iv,
        authTag,
        approvedSummary: null,
      }),
    );
    return this.toDecrypted(saved);
  }

  /** Principal/Counselor-only path — decrypts every row before returning. */
  async findForStudent(studentId: string): Promise<DecryptedCounselorNote[]> {
    const rows = await this.noteRepo.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDecrypted(row));
  }

  async setApprovedSummary(
    id: string,
    summary: string | null,
  ): Promise<DecryptedCounselorNote> {
    const row = await this.noteRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Counselor note ${id} not found.`);
    }
    row.approvedSummary = summary;
    const saved = await this.noteRepo.save(row);
    return this.toDecrypted(saved);
  }

  /**
   * Guardian-safe path. The `select` array is a structural guarantee — ciphertext/iv/authTag
   * are never fetched from the database at all, not merely excluded from serialization.
   */
  async findApprovedSummariesForGuardian(studentId: string): Promise<ApprovedSummaryRow[]> {
    const rows = await this.noteRepo.find({
      where: { studentId, approvedSummary: Not(IsNull()) },
      select: ['id', 'studentId', 'approvedSummary', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return rows as ApprovedSummaryRow[];
  }

  private toDecrypted(row: CounselorNoteEntity): DecryptedCounselorNote {
    return {
      id: row.id,
      studentId: row.studentId,
      caseId: row.caseId,
      counselorStaffId: row.counselorStaffId,
      notes: this.cryptoService.decrypt(row.ciphertext, row.iv, row.authTag),
      approvedSummary: row.approvedSummary,
      createdAt: row.createdAt,
    };
  }
}
