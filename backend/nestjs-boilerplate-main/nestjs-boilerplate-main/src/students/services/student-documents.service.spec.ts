import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StudentDocumentsService } from './student-documents.service';
import { StudentDocumentEntity, StudentDocumentType } from '../entities/student-document.entity';

describe('StudentDocumentsService', () => {
  let service: StudentDocumentsService;
  let documentRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    documentRepo = {
      find: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'doc-1', ...d })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentDocumentsService,
        { provide: getRepositoryToken(StudentDocumentEntity), useValue: documentRepo },
      ],
    }).compile();

    service = module.get<StudentDocumentsService>(StudentDocumentsService);
  });

  describe('listForStudent', () => {
    it('returns documents ordered newest-first', async () => {
      const docs = [{ id: 'doc-1' }];
      documentRepo.find.mockResolvedValue(docs);

      const result = await service.listForStudent('student-1');

      expect(documentRepo.find).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(docs);
    });
  });

  describe('recordIssued', () => {
    it('creates and saves a document record', async () => {
      const result = await service.recordIssued(
        'student-1',
        StudentDocumentType.CHARACTER_CERTIFICATE,
        'file-1',
        42,
      );

      expect(documentRepo.create).toHaveBeenCalledWith({
        studentId: 'student-1',
        type: StudentDocumentType.CHARACTER_CERTIFICATE,
        fileId: 'file-1',
        issuedByUserId: 42,
      });
      expect(result.id).toBe('doc-1');
    });
  });
});
