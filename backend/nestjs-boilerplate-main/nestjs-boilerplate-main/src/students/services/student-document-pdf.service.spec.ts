import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ObjectLiteral, Repository } from 'typeorm';
import { StudentDocumentPdfService } from './student-document-pdf.service';
import { StudentEntity, StudentStatus } from '../entities/student.entity';
import { StudentYearEndNoteEntity } from '../../student-notes/entities/student-year-end-note.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

const writeFileSyncMock = jest.fn();
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: (...args: unknown[]) => writeFileSyncMock(...args),
}));

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  create: jest.fn((d: Partial<T>) => d as T),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const makeStudent = (overrides: Partial<StudentEntity> = {}): StudentEntity =>
  ({
    id: 'student-1',
    firstName: 'Kasun',
    lastName: 'Bandara',
    admissionNumber: 'SIMS/2020/00001',
    status: StudentStatus.GRADUATED,
    leavingReason: null,
    createdAt: new Date('2020-01-15'),
    grade: { id: 13, name: 'Grade 13' },
    classSection: { id: 1, name: 'A' },
    ...overrides,
  }) as unknown as StudentEntity;

describe('StudentDocumentPdfService', () => {
  let service: StudentDocumentPdfService;
  let fileRepo: MockRepo<FileEntity>;

  beforeEach(async () => {
    fileRepo = repoMock<FileEntity>();
    writeFileSyncMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentDocumentPdfService,
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('api') } },
      ],
    }).compile();

    service = module.get<StudentDocumentPdfService>(StudentDocumentPdfService);
    jest.clearAllMocks();
  });

  describe('generateCharacterCertificate', () => {
    it('returns a non-empty PDF Buffer with no notes', async () => {
      const buffer = await service.generateCharacterCertificate(makeStudent(), []);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    }, 15000);

    it('returns a non-empty PDF Buffer when notes are present', async () => {
      const notes = [
        {
          academicYear: '2025',
          position: 'Head Prefect',
          extracurricularActivities: 'Debate team',
          generalRemarks: 'Excellent',
        } as unknown as StudentYearEndNoteEntity,
      ];

      const buffer = await service.generateCharacterCertificate(makeStudent(), notes);

      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    }, 15000);
  });

  describe('generateLeavingReport', () => {
    it('returns a non-empty PDF Buffer', async () => {
      const buffer = await service.generateLeavingReport(makeStudent());

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    }, 15000);
  });

  describe('persistAsFile', () => {
    it('writes the buffer to disk and creates a FileEntity', async () => {
      const buffer = Buffer.from('fake-pdf-bytes');

      const file = await service.persistAsFile(buffer);

      expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
      const createArg = (fileRepo.create as jest.Mock).mock.calls[0][0] as { path: string };
      expect(createArg.path).toMatch(/^\/api\/v1\/files\/.+\.pdf$/);
      expect(file).toBeDefined();
    });
  });
});
