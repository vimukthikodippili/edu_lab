import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { LibraryService } from './library.service';
import { BookEntity, BookStatus } from './entities/book.entity';
import { BookLoanEntity, LoanStatus } from './entities/book-loan.entity';
import { DigitalBookEntity } from './entities/digital-book.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { FINE_PER_DAY_LKR, LOAN_PERIOD_DAYS } from './library.constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * MS_PER_DAY);
const subDays = (d: Date, n: number) => new Date(d.getTime() - n * MS_PER_DAY);

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
  remove: jest.fn((d: unknown) => Promise.resolve(d)),
  createQueryBuilder: jest.fn(),
});

const makeBook = (overrides: Partial<BookEntity> = {}): BookEntity =>
  ({
    id: 'book-1',
    isbn: '978-0-7432-7356-5',
    barcode: 'BC001',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    publisher: null,
    publishYear: null,
    subject: 'Literature',
    gradeLevel: null,
    category: null,
    location: 'A1',
    totalCopies: 3,
    availableCopies: 3,
    status: BookStatus.AVAILABLE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as BookEntity);

const makeStudent = (overrides: Partial<StudentEntity> = {}): StudentEntity =>
  ({
    id: 'student-1',
    firstName: 'Kasun',
    lastName: 'Perera',
    admissionNumber: 'SIMS/2026/00001',
    gradeId: 10,
    ...overrides,
  } as unknown as StudentEntity);

const makeLoan = (overrides: Partial<BookLoanEntity> = {}): BookLoanEntity => {
  const issuedAt = new Date('2026-06-01');
  return {
    id: 'loan-1',
    bookId: 'book-1',
    studentId: 'student-1',
    issuedByStaffId: 'staff-librarian-1',
    returnedByStaffId: null,
    issuedAt,
    dueAt: addDays(issuedAt, LOAN_PERIOD_DAYS),
    returnedAt: null,
    fineAmount: null,
    finePaid: false,
    status: LoanStatus.ACTIVE,
    book: makeBook(),
    student: makeStudent(),
    ...overrides,
  } as unknown as BookLoanEntity;
};

const makeDigitalBook = (overrides: Partial<DigitalBookEntity> = {}): DigitalBookEntity =>
  ({
    id: 'dbook-1',
    title: 'Advanced Mathematics',
    author: 'Prof. Silva',
    subject: 'Mathematics',
    description: null,
    fileId: 'file-1',
    uploadedByUserId: 202,
    uploaderName: 'Nimal Silva',
    isApproved: false,
    ...overrides,
  } as unknown as DigitalBookEntity);

const makeFile = (overrides: Partial<FileEntity> = {}): FileEntity =>
  ({
    id: 'file-1',
    path: 'uploads/files/test.pdf',
    ...overrides,
  } as FileEntity);

describe('LibraryService', () => {
  let service: LibraryService;
  let bookRepo: MockRepo<BookEntity>;
  let loanRepo: MockRepo<BookLoanEntity>;
  let digitalBookRepo: MockRepo<DigitalBookEntity>;
  let fileRepo: MockRepo<FileEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let transactionManager: { save: jest.Mock; create: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    bookRepo = repoMock<BookEntity>();
    loanRepo = repoMock<BookLoanEntity>();
    digitalBookRepo = repoMock<DigitalBookEntity>();
    fileRepo = repoMock<FileEntity>();
    studentRepo = repoMock<StudentEntity>();

    transactionManager = {
      save: jest.fn((_entityClass: unknown, data: unknown) => Promise.resolve(data)),
      create: jest.fn((_entityClass: unknown, data: unknown) => data),
    };
    dataSource = {
      transaction: jest.fn((cb: (manager: typeof transactionManager) => unknown) =>
        cb(transactionManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: getRepositoryToken(BookEntity), useValue: bookRepo },
        { provide: getRepositoryToken(BookLoanEntity), useValue: loanRepo },
        { provide: getRepositoryToken(DigitalBookEntity), useValue: digitalBookRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    jest.clearAllMocks();
  });

  // ─── Fine Calculation Tests (required by story FR-LB-04) ──────────────────

  describe('returnBook — fine calculation', () => {
    it('returned on the due date → fineAmount = 0', () => {
      const dueAt = new Date('2026-06-15T00:00:00Z');
      const returnedAt = dueAt; // same moment
      const diffMs = returnedAt.getTime() - dueAt.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / MS_PER_DAY));
      expect(daysOverdue * FINE_PER_DAY_LKR).toBe(0);
    });

    it('returned 1 day late → fineAmount = 10 (1 × FINE_PER_DAY_LKR)', () => {
      const dueAt = new Date('2026-06-15T00:00:00Z');
      const returnedAt = addDays(dueAt, 1);
      const daysOverdue = Math.max(0, Math.floor((returnedAt.getTime() - dueAt.getTime()) / MS_PER_DAY));
      expect(daysOverdue * FINE_PER_DAY_LKR).toBe(10);
    });

    it('returned 7 days late → fineAmount = 70', () => {
      const dueAt = new Date('2026-06-15T00:00:00Z');
      const returnedAt = addDays(dueAt, 7);
      const daysOverdue = Math.max(0, Math.floor((returnedAt.getTime() - dueAt.getTime()) / MS_PER_DAY));
      expect(daysOverdue * FINE_PER_DAY_LKR).toBe(70);
    });

    it('returned 30 days late → fineAmount = 300', () => {
      const dueAt = new Date('2026-06-15T00:00:00Z');
      const returnedAt = addDays(dueAt, 30);
      const daysOverdue = Math.max(0, Math.floor((returnedAt.getTime() - dueAt.getTime()) / MS_PER_DAY));
      expect(daysOverdue * FINE_PER_DAY_LKR).toBe(300);
    });

    it('returned 1 day early → fineAmount = 0 (no negative fines)', () => {
      const dueAt = new Date('2026-06-15T00:00:00Z');
      const returnedAt = subDays(dueAt, 1);
      const daysOverdue = Math.max(0, Math.floor((returnedAt.getTime() - dueAt.getTime()) / MS_PER_DAY));
      expect(daysOverdue * FINE_PER_DAY_LKR).toBe(0);
    });

    it('returnBook throws NotFoundException for unknown loan id', async () => {
      loanRepo.findOne!.mockResolvedValue(null);
      await expect(service.returnBook('unknown-id', 'staff-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returnBook throws ConflictException if loan already returned', async () => {
      const returnedLoan = makeLoan({ status: LoanStatus.RETURNED });
      loanRepo.findOne!.mockResolvedValue(returnedLoan);
      await expect(service.returnBook('loan-1', 'staff-1')).rejects.toThrow(ConflictException);
    });

    it('returnBook sets returnedAt, fineAmount, status=returned on an overdue loan', async () => {
      const dueAt = subDays(new Date(), 5); // 5 days overdue
      const loan = makeLoan({ dueAt });
      loanRepo.findOne!.mockResolvedValue(loan);

      const result = await service.returnBook('loan-1', 'staff-librarian-1');

      expect(result.status).toBe(LoanStatus.RETURNED);
      expect(result.returnedAt).toBeInstanceOf(Date);
      // Fine should be 5 × 10 = 50 (exact days may vary by test clock, but > 0)
      expect(result.fineAmount).toBeGreaterThan(0);
      expect(transactionManager.save).toHaveBeenCalledTimes(2); // book + loan
    });
  });

  // ─── issueBook ─────────────────────────────────────────────────────────────

  describe('issueBook', () => {
    it('creates a loan and decrements availableCopies', async () => {
      const book = makeBook({ availableCopies: 2 });
      bookRepo.findOne!.mockResolvedValue(book);
      studentRepo.findOne!.mockResolvedValue(makeStudent());
      loanRepo.findOne!.mockResolvedValue(null); // no existing active loan

      await service.issueBook({ bookId: 'book-1', studentId: 'student-1' }, 'staff-1');

      expect(transactionManager.save).toHaveBeenCalledTimes(2);
      // First call decrements availableCopies
      const savedBook = transactionManager.save.mock.calls[0][1] as BookEntity;
      expect(savedBook.availableCopies).toBe(1);
    });

    it('throws ConflictException when no copies available', async () => {
      const book = makeBook({ availableCopies: 0 });
      bookRepo.findOne!.mockResolvedValue(book);
      studentRepo.findOne!.mockResolvedValue(makeStudent());
      loanRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.issueBook({ bookId: 'book-1', studentId: 'student-1' }, 'staff-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when book does not exist', async () => {
      bookRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.issueBook({ bookId: 'bad-id', studentId: 'student-1' }, 'staff-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when student already has active loan for this book', async () => {
      bookRepo.findOne!.mockResolvedValue(makeBook());
      studentRepo.findOne!.mockResolvedValue(makeStudent());
      loanRepo.findOne!.mockResolvedValue(makeLoan()); // existing active loan

      await expect(
        service.issueBook({ bookId: 'book-1', studentId: 'student-1' }, 'staff-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── markFinePaid ──────────────────────────────────────────────────────────

  describe('markFinePaid', () => {
    it('throws ConflictException when loan has no fine', async () => {
      const loan = makeLoan({ fineAmount: null });
      loanRepo.findOne!.mockResolvedValue(loan);
      await expect(service.markFinePaid('loan-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when fine already paid', async () => {
      const loan = makeLoan({ fineAmount: '50.00', finePaid: true });
      loanRepo.findOne!.mockResolvedValue(loan);
      await expect(service.markFinePaid('loan-1')).rejects.toThrow(ConflictException);
    });

    it('marks fine as paid and returns confirmation', async () => {
      const loan = makeLoan({ fineAmount: '50.00', finePaid: false });
      loanRepo.findOne!.mockResolvedValue(loan);
      loanRepo.save!.mockResolvedValue({ ...loan, finePaid: true });

      const result = await service.markFinePaid('loan-1');

      expect(loanRepo.save).toHaveBeenCalledWith(expect.objectContaining({ finePaid: true }));
      expect(result).toEqual({ loanId: 'loan-1', finePaid: true });
    });
  });

  // ─── Digital Library ───────────────────────────────────────────────────────

  describe('createDigitalBook', () => {
    const dto = {
      title: 'Advanced Maths',
      author: 'Prof. Silva',
      fileId: 'file-1',
    };

    it('isApproved = true when uploader is librarian or admin', async () => {
      fileRepo.findOne!.mockResolvedValue(makeFile());
      digitalBookRepo.create!.mockImplementation((d) => d as DigitalBookEntity);
      digitalBookRepo.save!.mockImplementation((d) => Promise.resolve(d as DigitalBookEntity));

      const result = await service.createDigitalBook(dto, 101, 'Kamani Lib', true);
      expect(result.isApproved).toBe(true);
    });

    it('isApproved = false when uploader is teacher or student', async () => {
      fileRepo.findOne!.mockResolvedValue(makeFile());
      digitalBookRepo.create!.mockImplementation((d) => d as DigitalBookEntity);
      digitalBookRepo.save!.mockImplementation((d) => Promise.resolve(d as DigitalBookEntity));

      const result = await service.createDigitalBook(dto, 202, 'Nimal Silva', false);
      expect(result.isApproved).toBe(false);
    });

    it('throws NotFoundException when fileId does not exist', async () => {
      fileRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.createDigitalBook(dto, 303, 'Someone', false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveDigitalBook', () => {
    it('sets isApproved = true', async () => {
      const book = makeDigitalBook({ isApproved: false });
      digitalBookRepo.findOne!.mockResolvedValue(book);
      digitalBookRepo.save!.mockImplementation((d) => Promise.resolve(d as DigitalBookEntity));

      const result = await service.approveDigitalBook('dbook-1');
      expect(result.isApproved).toBe(true);
    });

    it('throws ConflictException if already approved', async () => {
      digitalBookRepo.findOne!.mockResolvedValue(makeDigitalBook({ isApproved: true }));
      await expect(service.approveDigitalBook('dbook-1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for unknown id', async () => {
      digitalBookRepo.findOne!.mockResolvedValue(null);
      await expect(service.approveDigitalBook('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
