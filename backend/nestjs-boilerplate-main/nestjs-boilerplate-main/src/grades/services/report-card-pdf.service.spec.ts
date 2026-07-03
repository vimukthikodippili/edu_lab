import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ObjectLiteral, Repository } from 'typeorm';
import { ReportCardPdfService } from './report-card-pdf.service';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { StudentEntity } from '../../students/entities/student.entity';
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

describe('ReportCardPdfService', () => {
  let service: ReportCardPdfService;
  let fileRepo: MockRepo<FileEntity>;

  beforeEach(async () => {
    fileRepo = repoMock<FileEntity>();
    writeFileSyncMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCardPdfService,
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('api') },
        },
      ],
    }).compile();

    service = module.get<ReportCardPdfService>(ReportCardPdfService);
    jest.clearAllMocks();
  });

  describe('generatePdf', () => {
    it('returns a non-empty Buffer for valid fixtures', async () => {
      const termResult = {
        totalScore: '80',
        totalMaxScore: '100',
        percentage: '80',
        rank: 1,
        termId: 1,
        term: { name: 'Term 1 2026' },
      } as unknown as TermResultEntity;

      const subjectResults = [
        {
          subjectId: 'subj-1',
          subject: { name: 'Maths' },
          totalScore: '40',
          totalMaxScore: '50',
          percentage: '80',
          letterGrade: 'A',
        } as unknown as SubjectResultEntity,
      ];

      const student = {
        firstName: 'Jane',
        lastName: 'Doe',
        admissionNumber: 'A001',
      } as unknown as StudentEntity;

      const buffer = await service.generatePdf(termResult, subjectResults, student);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF files start with the %PDF- magic header
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    }, 15000);
  });

  describe('persistAsFile', () => {
    it('writes the buffer to disk and creates a FileEntity with the expected path shape', async () => {
      const buffer = Buffer.from('fake-pdf-bytes');

      const file = await service.persistAsFile(buffer);

      expect(writeFileSyncMock).toHaveBeenCalledTimes(1);
      const [writtenPath, writtenBuffer] = writeFileSyncMock.mock.calls[0];
      expect(String(writtenPath)).toMatch(/^files[\\/].+\.pdf$/);
      expect(writtenBuffer).toBe(buffer);

      expect(fileRepo.create).toHaveBeenCalledTimes(1);
      const createArg = (fileRepo.create as jest.Mock).mock.calls[0][0] as { path: string };
      expect(createArg.path).toMatch(/^\/api\/v1\/files\/.+\.pdf$/);
      expect(fileRepo.save).toHaveBeenCalledTimes(1);
      expect(file).toBeDefined();
    });
  });
});
