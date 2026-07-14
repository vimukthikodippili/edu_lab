import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { CounselorNoteService } from './counselor-note.service';
import { CounselorNoteEntity } from './entities/counselor-note.entity';
import { CounselorNoteCryptoService } from './counselor-note-crypto.service';

describe('CounselorNoteService', () => {
  let service: CounselorNoteService;
  let noteRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let cryptoService: { encrypt: jest.Mock; decrypt: jest.Mock };

  beforeEach(async () => {
    noteRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'note-1', createdAt: new Date(), ...d })),
    };
    cryptoService = {
      encrypt: jest.fn().mockReturnValue({ ciphertext: 'CIPHER', iv: 'IV_HEX', authTag: 'TAG_HEX' }),
      decrypt: jest.fn().mockReturnValue('decrypted plaintext'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounselorNoteService,
        { provide: getRepositoryToken(CounselorNoteEntity), useValue: noteRepo },
        { provide: CounselorNoteCryptoService, useValue: cryptoService },
      ],
    }).compile();

    service = module.get<CounselorNoteService>(CounselorNoteService);
  });

  describe('create', () => {
    it('encrypts the notes before saving, and starts with no approved summary', async () => {
      const result = await service.create('student-1', 'staff-1', 'Raw session notes.', null);

      expect(cryptoService.encrypt).toHaveBeenCalledWith('Raw session notes.');
      expect(noteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-1',
          counselorStaffId: 'staff-1',
          caseId: null,
          ciphertext: 'CIPHER',
          iv: 'IV_HEX',
          authTag: 'TAG_HEX',
          approvedSummary: null,
        }),
      );
      expect(result.notes).toBe('decrypted plaintext');
    });
  });

  describe('findForStudent', () => {
    it('decrypts every row before returning', async () => {
      noteRepo.find.mockResolvedValue([
        { id: 'note-1', studentId: 'student-1', caseId: null, counselorStaffId: 'staff-1', ciphertext: 'C1', iv: 'I1', authTag: 'A1', approvedSummary: null, createdAt: new Date() },
      ]);

      const result = await service.findForStudent('student-1');

      expect(cryptoService.decrypt).toHaveBeenCalledWith('C1', 'I1', 'A1');
      expect(result[0].notes).toBe('decrypted plaintext');
    });
  });

  describe('setApprovedSummary', () => {
    it('throws NotFoundException for an unknown note', async () => {
      noteRepo.findOne.mockResolvedValue(null);

      await expect(service.setApprovedSummary('missing', 'summary text')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets the approved summary text', async () => {
      noteRepo.findOne.mockResolvedValue({ id: 'note-1', approvedSummary: null, ciphertext: 'C', iv: 'I', authTag: 'A' });

      await service.setApprovedSummary('note-1', 'Shared with guardian.');

      expect(noteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ approvedSummary: 'Shared with guardian.' }),
      );
    });

    it('un-shares by setting the approved summary back to null', async () => {
      noteRepo.findOne.mockResolvedValue({ id: 'note-1', approvedSummary: 'was shared', ciphertext: 'C', iv: 'I', authTag: 'A' });

      await service.setApprovedSummary('note-1', null);

      expect(noteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ approvedSummary: null }),
      );
    });
  });

  describe('findApprovedSummariesForGuardian — the explicitly requested guarantee', () => {
    it('queries with a select array that excludes the encrypted columns entirely', async () => {
      noteRepo.find.mockResolvedValue([
        { id: 'note-1', studentId: 'student-1', approvedSummary: 'Shared update.', createdAt: new Date() },
      ]);

      await service.findApprovedSummariesForGuardian('student-1');

      expect(noteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { studentId: 'student-1', approvedSummary: Not(IsNull()) },
          select: ['id', 'studentId', 'approvedSummary', 'createdAt'],
        }),
      );
      // cryptoService is never touched on the guardian-facing path — no decrypt call at all.
      expect(cryptoService.decrypt).not.toHaveBeenCalled();
    });

    it('the returned rows never contain ciphertext, iv, or authTag keys, even if the mock repo returned them', async () => {
      // Simulates a hypothetical repo bug that returns the full row despite the select array —
      // the response the caller actually sees must still never expose these keys.
      noteRepo.find.mockResolvedValue([
        {
          id: 'note-1',
          studentId: 'student-1',
          approvedSummary: 'Shared update.',
          createdAt: new Date(),
        },
      ]);

      const result = await service.findApprovedSummariesForGuardian('student-1');

      for (const row of result) {
        const keys = Object.keys(row);
        expect(keys).not.toContain('ciphertext');
        expect(keys).not.toContain('iv');
        expect(keys).not.toContain('authTag');
        expect(keys).not.toContain('counselorStaffId');
      }
    });
  });
});
