import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { ReportCardGenerationListener } from './report-card-generation.listener';
import { ReportCardPdfService } from '../services/report-card-pdf.service';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { ResultsPublishedEvent } from '../events/results-published.event';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

describe('ReportCardGenerationListener', () => {
  let listener: ReportCardGenerationListener;
  let termResultRepo: MockRepo<TermResultEntity>;
  let subjectResultRepo: MockRepo<SubjectResultEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let reportCardPdfService: { generatePdf: jest.Mock; persistAsFile: jest.Mock };

  beforeEach(async () => {
    termResultRepo = repoMock<TermResultEntity>();
    subjectResultRepo = repoMock<SubjectResultEntity>();
    studentRepo = repoMock<StudentEntity>();
    reportCardPdfService = {
      generatePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
      persistAsFile: jest.fn().mockResolvedValue({ id: 'file-1', path: '/api/v1/files/x.pdf' } as FileEntity),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCardGenerationListener,
        { provide: ReportCardPdfService, useValue: reportCardPdfService },
        { provide: getRepositoryToken(TermResultEntity), useValue: termResultRepo },
        { provide: getRepositoryToken(SubjectResultEntity), useValue: subjectResultRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    listener = module.get<ReportCardGenerationListener>(ReportCardGenerationListener);
    jest.clearAllMocks();
    reportCardPdfService.generatePdf.mockResolvedValue(Buffer.from('pdf'));
    reportCardPdfService.persistAsFile.mockResolvedValue({ id: 'file-1', path: '/api/v1/files/x.pdf' } as FileEntity);
  });

  it('generates and persists a report card once per studentId in the event', async () => {
    termResultRepo.findOne!.mockImplementation(({ where }: { where: { studentId: string } }) =>
      Promise.resolve({ studentId: where.studentId, termId: 1 } as TermResultEntity),
    );
    subjectResultRepo.find!.mockResolvedValue([]);
    studentRepo.findOne!.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, firstName: 'A', lastName: 'B', admissionNumber: 'X1' } as StudentEntity),
    );

    const event = new ResultsPublishedEvent(1, 1, ['s1', 's2', 's3']);
    await listener.handle(event);

    expect(reportCardPdfService.generatePdf).toHaveBeenCalledTimes(3);
    expect(reportCardPdfService.persistAsFile).toHaveBeenCalledTimes(3);
    expect(termResultRepo.save).toHaveBeenCalledTimes(3);
    (termResultRepo.save as jest.Mock).mock.calls.forEach((call) => {
      expect((call[0] as TermResultEntity).reportCardFileId).toBe('file-1');
    });
  });

  it('does not throw and still processes other students when one student fails', async () => {
    termResultRepo.findOne!.mockImplementation(({ where }: { where: { studentId: string } }) => {
      if (where.studentId === 's2') return Promise.resolve(null); // simulates a missing result
      return Promise.resolve({ studentId: where.studentId, termId: 1 } as TermResultEntity);
    });
    subjectResultRepo.find!.mockResolvedValue([]);
    studentRepo.findOne!.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({ id: where.id, firstName: 'A', lastName: 'B', admissionNumber: 'X1' } as StudentEntity),
    );

    const event = new ResultsPublishedEvent(1, 1, ['s1', 's2', 's3']);

    await expect(listener.handle(event)).resolves.toBeUndefined();
    expect(termResultRepo.save).toHaveBeenCalledTimes(2);
  });

  it('does not propagate a rejection from the PDF service', async () => {
    termResultRepo.findOne!.mockResolvedValue({ studentId: 's1', termId: 1 } as TermResultEntity);
    subjectResultRepo.find!.mockResolvedValue([]);
    studentRepo.findOne!.mockResolvedValue({
      id: 's1',
      firstName: 'A',
      lastName: 'B',
      admissionNumber: 'X1',
    } as StudentEntity);
    reportCardPdfService.generatePdf.mockRejectedValueOnce(new Error('pdf failed'));

    const event = new ResultsPublishedEvent(1, 1, ['s1']);

    await expect(listener.handle(event)).resolves.toBeUndefined();
    expect(termResultRepo.save).not.toHaveBeenCalled();
  });
});
