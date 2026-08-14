import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { BookEntity, BookStatus } from './entities/book.entity';
import { BookLoanEntity, LoanStatus } from './entities/book-loan.entity';
import { DigitalBookEntity } from './entities/digital-book.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { IssueBookDto } from './dto/issue-book.dto';
import { CreateDigitalBookDto } from './dto/create-digital-book.dto';
import { FINE_PER_DAY_LKR, LOAN_PERIOD_DAYS } from './library.constants';

export interface LoanListRow {
  id: string;
  bookId: string;
  bookTitle: string;
  bookBarcode: string;
  borrowerType: 'student' | 'staff';
  borrowerId: string;
  borrowerName: string;
  studentId: string | null;
  studentName: string;
  admissionNumber: string;
  issuedAt: Date;
  dueAt: Date;
  returnedAt: Date | null;
  fineAmount: number | null;
  finePaid: boolean;
  status: LoanStatus;
  daysOverdue: number;
}

export interface FineListRow {
  loanId: string;
  bookTitle: string;
  studentName: string;
  admissionNumber: string;
  issuedAt: Date;
  returnedAt: Date | null;
  fineAmount: number;
  finePaid: boolean;
  status: LoanStatus;
}

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectRepository(BookEntity)
    private readonly bookRepo: Repository<BookEntity>,
    @InjectRepository(BookLoanEntity)
    private readonly loanRepo: Repository<BookLoanEntity>,
    @InjectRepository(DigitalBookEntity)
    private readonly digitalBookRepo: Repository<DigitalBookEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Book Catalog ─────────────────────────────────────────────────────────

  async findBooks(search?: string, subject?: string, gradeLevel?: string): Promise<BookEntity[]> {
    const qb = this.bookRepo.createQueryBuilder('b').orderBy('b.title', 'ASC');
    if (subject) qb.andWhere('b.subject ILIKE :subject', { subject: `%${subject}%` });
    if (gradeLevel) qb.andWhere('b.gradeLevel ILIKE :gradeLevel', { gradeLevel: `%${gradeLevel}%` });
    if (search)
      qb.andWhere(
        '(b.title ILIKE :q OR b.author ILIKE :q OR b.isbn ILIKE :q OR b.barcode ILIKE :q)',
        { q: `%${search}%` },
      );
    return qb.getMany();
  }

  async createBook(dto: CreateBookDto): Promise<BookEntity> {
    const existing = await this.bookRepo.findOne({
      where: [{ isbn: dto.isbn }, { barcode: dto.barcode }],
    });
    if (existing) {
      throw new ConflictException('A book with this ISBN or barcode already exists.');
    }
    const copies = dto.totalCopies ?? 1;
    const book = this.bookRepo.create({
      ...dto,
      totalCopies: copies,
      availableCopies: copies,
      status: BookStatus.AVAILABLE,
    });
    return this.bookRepo.save(book);
  }

  async updateBook(id: string, dto: UpdateBookDto): Promise<BookEntity> {
    const book = await this.bookRepo.findOne({ where: { id } });
    if (!book) throw new NotFoundException(`Book ${id} not found.`);

    if (dto.totalCopies !== undefined) {
      const issuedCount = book.totalCopies - book.availableCopies;
      const newAvailable = dto.totalCopies - issuedCount;
      if (newAvailable < 0)
        throw new ConflictException(
          `Cannot reduce total copies below the number currently issued (${issuedCount}).`,
        );
      book.availableCopies = newAvailable;
    }
    Object.assign(book, dto);
    return this.bookRepo.save(book);
  }

  async deleteBook(id: string): Promise<void> {
    const book = await this.bookRepo.findOne({ where: { id } });
    if (!book) throw new NotFoundException(`Book ${id} not found.`);
    const activeLoans = await this.loanRepo.count({
      where: { bookId: id, status: LoanStatus.ACTIVE },
    });
    if (activeLoans > 0)
      throw new ConflictException('Cannot delete a book with active loans.');
    await this.bookRepo.remove(book);
  }

  async findBookByBarcode(barcode: string): Promise<BookEntity> {
    const book = await this.bookRepo.findOne({ where: { barcode } });
    if (!book) throw new NotFoundException(`No book found with barcode "${barcode}".`);
    return book;
  }

  // ─── Book Issuance & Return ───────────────────────────────────────────────

  async issueBook(dto: IssueBookDto, issuedByStaffId: string): Promise<BookLoanEntity> {
    if (!!dto.studentId === !!dto.staffId) {
      throw new BadRequestException(
        'Provide exactly one of studentId or staffId to issue this book to.',
      );
    }

    const book = await this.bookRepo.findOne({ where: { id: dto.bookId } });
    if (!book) throw new NotFoundException(`Book ${dto.bookId} not found.`);
    if (book.availableCopies <= 0)
      throw new ConflictException('No copies of this book are currently available.');

    if (dto.studentId) {
      const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
      if (!student) throw new NotFoundException(`Student ${dto.studentId} not found.`);

      const existingActiveLoan = await this.loanRepo.findOne({
        where: { bookId: dto.bookId, studentId: dto.studentId, status: LoanStatus.ACTIVE },
      });
      if (existingActiveLoan)
        throw new ConflictException('This student already has an active loan for this book.');
    } else {
      const staff = await this.staffRepo.findOne({ where: { id: dto.staffId } });
      if (!staff) throw new NotFoundException(`Staff member ${dto.staffId} not found.`);

      const existingActiveLoan = await this.loanRepo.findOne({
        where: { bookId: dto.bookId, borrowerStaffId: dto.staffId, status: LoanStatus.ACTIVE },
      });
      if (existingActiveLoan)
        throw new ConflictException('This staff member already has an active loan for this book.');
    }

    const now = new Date();
    return this.dataSource.transaction(async (manager) => {
      book.availableCopies -= 1;
      await manager.save(BookEntity, book);
      const loan = manager.create(BookLoanEntity, {
        bookId: dto.bookId,
        studentId: dto.studentId ?? null,
        borrowerStaffId: dto.staffId ?? null,
        issuedByStaffId,
        issuedAt: now,
        dueAt: new Date(now.getTime() + LOAN_PERIOD_DAYS * 24 * 60 * 60 * 1000),
        status: LoanStatus.ACTIVE,
        fineAmount: null,
        finePaid: false,
        returnedAt: null,
        returnedByStaffId: null,
      });
      return manager.save(BookLoanEntity, loan);
    });
  }

  async returnBook(loanId: string, returnedByStaffId: string): Promise<LoanListRow> {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: ['book', 'student', 'borrowerStaff'],
    });
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found.`);
    if (loan.status === LoanStatus.RETURNED)
      throw new ConflictException('This book has already been returned.');

    const returnedAt = new Date();
    const diffMs = returnedAt.getTime() - loan.dueAt.getTime();
    const daysOverdue = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    const fineAmount = daysOverdue * FINE_PER_DAY_LKR;

    await this.dataSource.transaction(async (manager) => {
      loan.book.availableCopies += 1;
      await manager.save(BookEntity, loan.book);

      loan.returnedAt = returnedAt;
      loan.returnedByStaffId = returnedByStaffId;
      loan.fineAmount = String(fineAmount);
      loan.finePaid = false;
      loan.status = LoanStatus.RETURNED;
      await manager.save(BookLoanEntity, loan);
    });

    return this.enrichLoan(loan, returnedAt, daysOverdue, fineAmount);
  }

  async findMyLoans(userId: number): Promise<LoanListRow[]> {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException(
        'Your account is not yet linked to a student record — contact your school administrator.',
      );
    }
    return this.findLoans(undefined, student.id);
  }

  async findMyStaffLoans(staffId: string): Promise<LoanListRow[]> {
    return this.findLoans(undefined, undefined, staffId);
  }

  async findLoans(
    status?: LoanStatus,
    studentId?: string,
    staffId?: string,
  ): Promise<LoanListRow[]> {
    const qb = this.loanRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.book', 'book')
      .leftJoinAndSelect('l.student', 'student')
      .leftJoinAndSelect('l.borrowerStaff', 'borrowerStaff')
      .orderBy('l.issuedAt', 'DESC');
    if (status) qb.andWhere('l.status = :status', { status });
    if (studentId) qb.andWhere('l.studentId = :studentId', { studentId });
    if (staffId) qb.andWhere('l.borrowerStaffId = :staffId', { staffId });

    const loans = await qb.getMany();
    const now = new Date();
    return loans.map((l) => {
      const compareDate = l.status === LoanStatus.RETURNED ? (l.returnedAt ?? now) : now;
      const daysOverdue = Math.max(
        0,
        Math.floor((compareDate.getTime() - l.dueAt.getTime()) / (24 * 60 * 60 * 1000)),
      );
      const fineAmt = l.fineAmount !== null ? parseFloat(l.fineAmount) : null;
      return this.enrichLoan(l, l.returnedAt, daysOverdue, fineAmt ?? 0);
    });
  }

  async findFines(paid?: boolean): Promise<FineListRow[]> {
    const qb = this.loanRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.book', 'book')
      .leftJoinAndSelect('l.student', 'student')
      .leftJoinAndSelect('l.borrowerStaff', 'borrowerStaff')
      .where('l.fineAmount IS NOT NULL AND l.fineAmount > 0')
      .orderBy('l.returnedAt', 'DESC');
    if (paid !== undefined) qb.andWhere('l.finePaid = :paid', { paid });

    const loans = await qb.getMany();
    return loans.map((l) => {
      const isStaffLoan = l.borrowerStaffId !== null;
      const borrowerName = isStaffLoan
        ? `${l.borrowerStaff?.firstName ?? ''} ${l.borrowerStaff?.lastName ?? ''}`.trim()
        : `${l.student?.firstName ?? ''} ${l.student?.lastName ?? ''}`.trim();
      return {
        loanId: l.id,
        bookTitle: l.book?.title ?? '',
        studentName: borrowerName,
        admissionNumber: isStaffLoan
          ? (l.borrowerStaff?.employeeNumber ?? '')
          : (l.student?.admissionNumber ?? ''),
        issuedAt: l.issuedAt,
        returnedAt: l.returnedAt,
        fineAmount: parseFloat(l.fineAmount ?? '0'),
        finePaid: l.finePaid,
        status: l.status,
      };
    });
  }

  async markFinePaid(loanId: string): Promise<{ loanId: string; finePaid: boolean }> {
    const loan = await this.loanRepo.findOne({ where: { id: loanId } });
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found.`);
    if (!loan.fineAmount || parseFloat(loan.fineAmount) <= 0)
      throw new ConflictException('This loan has no outstanding fine.');
    if (loan.finePaid) throw new ConflictException('Fine has already been marked as paid.');
    loan.finePaid = true;
    await this.loanRepo.save(loan);
    return { loanId, finePaid: true };
  }

  // ─── Digital Library ──────────────────────────────────────────────────────

  async createDigitalBook(
    dto: CreateDigitalBookDto,
    uploadedByUserId: number,
    uploaderName: string,
    isLibrarianOrAdmin: boolean,
  ): Promise<DigitalBookEntity> {
    const file = await this.fileRepo.findOne({ where: { id: dto.fileId } });
    if (!file) throw new NotFoundException(`File ${dto.fileId} not found.`);

    const entry = this.digitalBookRepo.create({
      ...dto,
      subject: dto.subject ?? null,
      description: dto.description ?? null,
      uploadedByUserId,
      uploaderName,
      isApproved: isLibrarianOrAdmin,
    });
    return this.digitalBookRepo.save(entry);
  }

  async findDigitalBooks(approvedOnly = true): Promise<Array<Record<string, unknown>>> {
    const where = approvedOnly ? { isApproved: true } : {};
    const books = await this.digitalBookRepo.find({
      where,
      relations: ['file'],
      order: { createdAt: 'DESC' },
    });
    return books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      subject: b.subject,
      description: b.description,
      fileId: b.fileId,
      filePath: b.file?.path ?? '',
      uploadedByUserId: b.uploadedByUserId,
      uploaderName: b.uploaderName,
      isApproved: b.isApproved,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  }

  async approveDigitalBook(id: string): Promise<DigitalBookEntity> {
    const book = await this.digitalBookRepo.findOne({ where: { id } });
    if (!book) throw new NotFoundException(`Digital book ${id} not found.`);
    if (book.isApproved) throw new ConflictException('This book is already approved.');
    book.isApproved = true;
    return this.digitalBookRepo.save(book);
  }

  async deleteDigitalBook(id: string): Promise<void> {
    const book = await this.digitalBookRepo.findOne({ where: { id } });
    if (!book) throw new NotFoundException(`Digital book ${id} not found.`);
    await this.digitalBookRepo.remove(book);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private enrichLoan(
    loan: BookLoanEntity,
    returnedAt: Date | null,
    daysOverdue: number,
    fineAmount: number,
  ): LoanListRow {
    const isStaffLoan = loan.borrowerStaffId !== null;
    const borrowerName = isStaffLoan
      ? `${loan.borrowerStaff?.firstName ?? ''} ${loan.borrowerStaff?.lastName ?? ''}`.trim()
      : `${loan.student?.firstName ?? ''} ${loan.student?.lastName ?? ''}`.trim();

    return {
      id: loan.id,
      bookId: loan.bookId,
      bookTitle: loan.book?.title ?? '',
      bookBarcode: loan.book?.barcode ?? '',
      borrowerType: isStaffLoan ? 'staff' : 'student',
      borrowerId: isStaffLoan ? (loan.borrowerStaffId as string) : (loan.studentId as string),
      borrowerName,
      studentId: loan.studentId,
      studentName: isStaffLoan ? '' : borrowerName,
      admissionNumber: isStaffLoan
        ? (loan.borrowerStaff?.employeeNumber ?? '')
        : (loan.student?.admissionNumber ?? ''),
      issuedAt: loan.issuedAt,
      dueAt: loan.dueAt,
      returnedAt,
      fineAmount: fineAmount > 0 ? fineAmount : null,
      finePaid: loan.finePaid,
      status: loan.status,
      daysOverdue,
    };
  }
}
