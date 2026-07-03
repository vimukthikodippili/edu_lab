import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { FeesService } from './fees.service';
import { FeeStructureEntity } from './entities/fee-structure.entity';
import { InvoiceEntity, InvoiceStatus } from './entities/invoice.entity';
import {
  FeeWaiverRequestEntity,
  FeeWaiverStatus,
} from './entities/fee-waiver-request.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { AcademicTermEntity } from '../grades/entities/academic-term.entity';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
  remove: jest.fn((d: unknown) => Promise.resolve(d)),
});

const makeTerm = (overrides: Partial<AcademicTermEntity> = {}): AcademicTermEntity =>
  ({
    id: 1,
    name: 'Term 1 2026',
    termNumber: 1,
    academicYear: '2026',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-04-30'),
    ...overrides,
  } as AcademicTermEntity);

const makeGuardian = (overrides: Partial<GuardianEntity> = {}): GuardianEntity =>
  ({
    id: 'guardian-1',
    firstName: 'Paul',
    lastName: 'Doe',
    email: 'paul@example.com',
    phone: '0771234567',
    ...overrides,
  } as GuardianEntity);

const makeStudent = (overrides: Partial<StudentEntity> = {}): StudentEntity =>
  ({
    id: 'student-1',
    firstName: 'Jane',
    lastName: 'Doe',
    admissionNumber: 'A001',
    gradeId: 10,
    status: StudentStatus.ACTIVE,
    studentGuardians: [{ guardian: makeGuardian(), isPrimaryContact: true }],
    ...overrides,
  } as unknown as StudentEntity);

const makeFeeStructure = (
  overrides: Partial<FeeStructureEntity> = {},
): FeeStructureEntity =>
  ({
    id: 1,
    gradeId: 10,
    termId: 1,
    feeCategory: 'Tuition',
    amount: '5000.00',
    ...overrides,
  } as FeeStructureEntity);

const makeInvoice = (overrides: Partial<InvoiceEntity> = {}): InvoiceEntity =>
  ({
    id: 'invoice-1',
    studentId: 'student-1',
    termId: 1,
    amount: '5000.00',
    discountAmount: '0.00',
    status: InvoiceStatus.PENDING,
    dueDate: new Date('2026-04-30'),
    ...overrides,
  } as InvoiceEntity);

const makeWaiverRequest = (
  overrides: Partial<FeeWaiverRequestEntity> = {},
): FeeWaiverRequestEntity =>
  ({
    id: 'waiver-1',
    studentId: 'student-1',
    invoiceId: 'invoice-1',
    requestedDiscountAmount: '1000.00',
    reason: 'Family financial hardship',
    status: FeeWaiverStatus.PENDING,
    requestedById: 'staff-accountant-1',
    decidedById: null,
    decidedAt: null,
    decisionNote: null,
    ...overrides,
  } as FeeWaiverRequestEntity);

describe('FeesService', () => {
  let service: FeesService;
  let feeStructureRepo: MockRepo<FeeStructureEntity>;
  let invoiceRepo: MockRepo<InvoiceEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let termRepo: MockRepo<AcademicTermEntity>;
  let waiverRequestRepo: MockRepo<FeeWaiverRequestEntity>;
  let notificationService: { createForGuardian: jest.Mock };
  let transactionManager: { findOne: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    feeStructureRepo = repoMock<FeeStructureEntity>();
    invoiceRepo = repoMock<InvoiceEntity>();
    studentRepo = repoMock<StudentEntity>();
    termRepo = repoMock<AcademicTermEntity>();
    waiverRequestRepo = repoMock<FeeWaiverRequestEntity>();
    notificationService = { createForGuardian: jest.fn().mockResolvedValue(undefined) };

    transactionManager = {
      findOne: jest.fn(),
      save: jest.fn((_entityClass: unknown, data: unknown) => Promise.resolve(data)),
    };
    dataSource = {
      transaction: jest.fn((cb: (manager: typeof transactionManager) => unknown) =>
        cb(transactionManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        { provide: getRepositoryToken(FeeStructureEntity), useValue: feeStructureRepo },
        { provide: getRepositoryToken(InvoiceEntity), useValue: invoiceRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(AcademicTermEntity), useValue: termRepo },
        { provide: getRepositoryToken(FeeWaiverRequestEntity), useValue: waiverRequestRepo },
        { provide: NotificationService, useValue: notificationService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<FeesService>(FeesService);
    jest.clearAllMocks();
    notificationService.createForGuardian.mockResolvedValue(undefined);
    transactionManager.save.mockImplementation((_entityClass: unknown, data: unknown) =>
      Promise.resolve(data),
    );
    dataSource.transaction.mockImplementation(
      (cb: (manager: typeof transactionManager) => unknown) => cb(transactionManager),
    );
  });

  describe('generateInvoicesForTerm', () => {
    it('generates one invoice per active student with a matching fee structure, summing multiple categories', async () => {
      termRepo.findOne!.mockResolvedValue(makeTerm());
      studentRepo.find!.mockResolvedValue([makeStudent({ id: 's1', gradeId: 10 })]);
      invoiceRepo.find!.mockResolvedValue([]);
      feeStructureRepo.find!.mockResolvedValue([
        makeFeeStructure({ gradeId: 10, amount: '5000.00', feeCategory: 'Tuition' }),
        makeFeeStructure({ gradeId: 10, amount: '500.00', feeCategory: 'Library' }),
      ]);

      const summary = await service.generateInvoicesForTerm(1);

      expect(summary.generatedCount).toBe(1);
      expect(summary.skippedAlreadyExistsCount).toBe(0);
      expect(summary.skippedNoFeeStructureCount).toBe(0);

      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
      const saved = (invoiceRepo.save as jest.Mock).mock.calls[0][0] as InvoiceEntity[];
      expect(saved).toHaveLength(1);
      expect(saved[0].amount).toBe('5500');
      expect(saved[0].status).toBe(InvoiceStatus.PENDING);
      expect(saved[0].dueDate).toEqual(makeTerm().endDate);
    });

    it('skips and counts students whose grade has no matching fee structure', async () => {
      termRepo.findOne!.mockResolvedValue(makeTerm());
      studentRepo.find!.mockResolvedValue([makeStudent({ id: 's1', gradeId: 99 })]);
      invoiceRepo.find!.mockResolvedValue([]);
      feeStructureRepo.find!.mockResolvedValue([
        makeFeeStructure({ gradeId: 10 }), // different grade — no match
      ]);

      const summary = await service.generateInvoicesForTerm(1);

      expect(summary.generatedCount).toBe(0);
      expect(summary.skippedNoFeeStructureCount).toBe(1);
      expect(invoiceRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown term', async () => {
      termRepo.findOne!.mockResolvedValue(null);

      await expect(service.generateInvoicesForTerm(999)).rejects.toThrow(NotFoundException);
      expect(invoiceRepo.save).not.toHaveBeenCalled();
    });

    it('is idempotent: running twice does not duplicate invoices for the same student+term', async () => {
      termRepo.findOne!.mockResolvedValue(makeTerm());
      studentRepo.find!.mockResolvedValue([makeStudent({ id: 's1', gradeId: 10 })]);
      feeStructureRepo.find!.mockResolvedValue([makeFeeStructure({ gradeId: 10, amount: '5000.00' })]);

      // First run: no existing invoices yet.
      invoiceRepo.find!.mockResolvedValueOnce([]);
      const firstRun = await service.generateInvoicesForTerm(1);

      expect(firstRun.generatedCount).toBe(1);
      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
      const createdInFirstRun = (invoiceRepo.save as jest.Mock).mock.calls[0][0] as InvoiceEntity[];

      // Second run: simulate the invoice from the first run now existing.
      invoiceRepo.find!.mockResolvedValueOnce(createdInFirstRun);
      const secondRun = await service.generateInvoicesForTerm(1);

      expect(secondRun.generatedCount).toBe(0);
      expect(secondRun.skippedAlreadyExistsCount).toBe(firstRun.generatedCount);
      // save() must not be called again on the second, fully-idempotent run.
      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('effective status computation (via getInvoicesForStudent)', () => {
    it('shows overdue for a pending invoice past its due date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      invoiceRepo.find!.mockResolvedValue([
        makeInvoice({ status: InvoiceStatus.PENDING, dueDate: yesterday }),
      ]);

      const [result] = await service.getInvoicesForStudent('student-1');
      expect(result.effectiveStatus).toBe(InvoiceStatus.OVERDUE);
      expect(result.status).toBe(InvoiceStatus.PENDING); // stored status unchanged
    });

    it('shows pending for a pending invoice before its due date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      invoiceRepo.find!.mockResolvedValue([
        makeInvoice({ status: InvoiceStatus.PENDING, dueDate: tomorrow }),
      ]);

      const [result] = await service.getInvoicesForStudent('student-1');
      expect(result.effectiveStatus).toBe(InvoiceStatus.PENDING);
    });

    it('never shows overdue for a paid invoice, regardless of due date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      invoiceRepo.find!.mockResolvedValue([
        makeInvoice({ status: InvoiceStatus.PAID, dueDate: yesterday }),
      ]);

      const [result] = await service.getInvoicesForStudent('student-1');
      expect(result.effectiveStatus).toBe(InvoiceStatus.PAID);
    });
  });

  describe('fee structure CRUD', () => {
    it('creates a fee structure row', async () => {
      feeStructureRepo.save!.mockResolvedValue(makeFeeStructure());

      const result = await service.createStructure({
        gradeId: 10,
        termId: 1,
        feeCategory: 'Tuition',
        amount: 5000,
      });

      expect(feeStructureRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when updating an unknown fee structure', async () => {
      feeStructureRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateStructure(999, { amount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when removing an unknown fee structure', async () => {
      feeStructureRepo.findOne!.mockResolvedValue(null);

      await expect(service.removeStructure(999)).rejects.toThrow(NotFoundException);
      expect(feeStructureRepo.remove).not.toHaveBeenCalled();
    });

    it('removes an existing fee structure', async () => {
      const structure = makeFeeStructure();
      feeStructureRepo.findOne!.mockResolvedValue(structure);

      await service.removeStructure(1);

      expect(feeStructureRepo.remove).toHaveBeenCalledWith(structure);
    });
  });

  describe('sendDueSoonReminders', () => {
    it('reminds guardians for a pending invoice due within the window and marks it reminded', async () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      const invoice = makeInvoice({ dueDate: inThreeDays, dueSoonReminderSentAt: null });

      invoiceRepo.find!.mockResolvedValue([invoice]);
      studentRepo.find!.mockResolvedValue([makeStudent({ id: 'student-1' })]);

      const summary = await service.sendDueSoonReminders(7);

      expect(summary.invoicesProcessed).toBe(1);
      expect(summary.remindersSent).toBe(1);
      expect(notificationService.createForGuardian).toHaveBeenCalledTimes(1);
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-1',
        expect.any(String),
        expect.any(String),
        'fee_due_soon',
        expect.objectContaining({ invoiceId: 'invoice-1' }),
      );

      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
      const saved = (invoiceRepo.save as jest.Mock).mock.calls[0][0] as InvoiceEntity[];
      expect(saved[0].dueSoonReminderSentAt).toBeInstanceOf(Date);
    });

    it('excludes invoices outside the window, already reminded, or not pending (via the query itself)', async () => {
      // The query-level filter (status=pending, dueDate within window, dueSoonReminderSentAt IS NULL)
      // is what the mock simulates by resolving an empty array — proving the service correctly
      // returns a no-op summary and never calls save/notify when nothing matches.
      invoiceRepo.find!.mockResolvedValue([]);

      const summary = await service.sendDueSoonReminders(7);

      expect(summary).toEqual({ invoicesProcessed: 0, remindersSent: 0 });
      expect(notificationService.createForGuardian).not.toHaveBeenCalled();
      expect(invoiceRepo.save).not.toHaveBeenCalled();
    });

    it('is idempotent: a second run finds nothing left to remind once dueSoonReminderSentAt is set', async () => {
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      studentRepo.find!.mockResolvedValue([makeStudent({ id: 'student-1' })]);

      // First run: invoice not yet reminded.
      invoiceRepo.find!.mockResolvedValueOnce([
        makeInvoice({ dueDate: inThreeDays, dueSoonReminderSentAt: null }),
      ]);
      const firstRun = await service.sendDueSoonReminders(7);
      expect(firstRun.remindersSent).toBe(1);

      // Second run: simulates the repo's IS NULL filter now excluding the already-reminded invoice.
      invoiceRepo.find!.mockResolvedValueOnce([]);
      const secondRun = await service.sendDueSoonReminders(7);

      expect(secondRun.invoicesProcessed).toBe(0);
      expect(secondRun.remindersSent).toBe(0);
      expect(notificationService.createForGuardian).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendOverdueNotices', () => {
    it('flags a pending overdue invoice and notifies guardians', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const invoice = makeInvoice({ status: InvoiceStatus.PENDING, dueDate: yesterday });

      invoiceRepo.find!.mockResolvedValue([invoice]);
      studentRepo.find!.mockResolvedValue([makeStudent({ id: 'student-1' })]);

      const summary = await service.sendOverdueNotices();

      expect(summary.invoicesFlagged).toBe(1);
      expect(summary.noticesSent).toBe(1);
      expect(notificationService.createForGuardian).toHaveBeenCalledWith(
        'guardian-1',
        expect.any(String),
        expect.any(String),
        'fee_overdue',
        expect.objectContaining({ invoiceId: 'invoice-1' }),
      );

      const saved = (invoiceRepo.save as jest.Mock).mock.calls[0][0] as InvoiceEntity[];
      expect(saved[0].status).toBe(InvoiceStatus.OVERDUE);
    });

    it('does nothing when no pending invoices are past due', async () => {
      invoiceRepo.find!.mockResolvedValue([]);

      const summary = await service.sendOverdueNotices();

      expect(summary).toEqual({ invoicesFlagged: 0, noticesSent: 0 });
      expect(notificationService.createForGuardian).not.toHaveBeenCalled();
      expect(invoiceRepo.save).not.toHaveBeenCalled();
    });

    it('is idempotent: a second run finds nothing left to flag once status is overdue', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      studentRepo.find!.mockResolvedValue([makeStudent({ id: 'student-1' })]);

      invoiceRepo.find!.mockResolvedValueOnce([
        makeInvoice({ status: InvoiceStatus.PENDING, dueDate: yesterday }),
      ]);
      const firstRun = await service.sendOverdueNotices();
      expect(firstRun.invoicesFlagged).toBe(1);

      // Second run: simulates the repo's status=pending filter now excluding the flagged invoice.
      invoiceRepo.find!.mockResolvedValueOnce([]);
      const secondRun = await service.sendOverdueNotices();

      expect(secondRun.invoicesFlagged).toBe(0);
      expect(secondRun.noticesSent).toBe(0);
      expect(notificationService.createForGuardian).toHaveBeenCalledTimes(1);
    });
  });

  describe('createWaiverRequest', () => {
    it('creates a pending request without touching the invoice', async () => {
      const invoice = makeInvoice({ amount: '5000.00', discountAmount: '0.00' });
      invoiceRepo.findOne!.mockResolvedValue(invoice);
      waiverRequestRepo.findOne!.mockResolvedValue(null);
      waiverRequestRepo.save!.mockImplementation((d: unknown) => Promise.resolve(d));

      const result = await service.createWaiverRequest(
        { invoiceId: 'invoice-1', requestedDiscountAmount: 1000, reason: 'Hardship' },
        'staff-accountant-1',
      );

      expect(result.status).toBe(FeeWaiverStatus.PENDING);
      expect(result.requestedById).toBe('staff-accountant-1');
      expect(invoiceRepo.save).not.toHaveBeenCalled();
      expect(invoice.amount).toBe('5000.00');
      expect(invoice.discountAmount).toBe('0.00');
    });

    it('throws NotFoundException for an unknown invoice', async () => {
      invoiceRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.createWaiverRequest(
          { invoiceId: 'missing', requestedDiscountAmount: 100, reason: 'x' },
          'staff-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a discount exceeding the invoice outstanding balance', async () => {
      invoiceRepo.findOne!.mockResolvedValue(
        makeInvoice({ amount: '5000.00', discountAmount: '0.00' }),
      );

      await expect(
        service.createWaiverRequest(
          { invoiceId: 'invoice-1', requestedDiscountAmount: 6000, reason: 'x' },
          'staff-1',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(waiverRequestRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a second pending request on an invoice that already has one pending', async () => {
      invoiceRepo.findOne!.mockResolvedValue(makeInvoice());
      waiverRequestRepo.findOne!.mockResolvedValue(makeWaiverRequest());

      await expect(
        service.createWaiverRequest(
          { invoiceId: 'invoice-1', requestedDiscountAmount: 500, reason: 'x' },
          'staff-1',
        ),
      ).rejects.toThrow(ConflictException);
      expect(waiverRequestRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('decideWaiverRequest', () => {
    it('rejecting a request leaves the invoice fully unchanged', async () => {
      const invoice = makeInvoice({ amount: '5000.00', discountAmount: '0.00' });
      const request = makeWaiverRequest();
      waiverRequestRepo.findOne!.mockResolvedValue(request);
      waiverRequestRepo.save!.mockImplementation((d: unknown) => Promise.resolve(d));

      const result = await service.decideWaiverRequest(
        'waiver-1',
        FeeWaiverStatus.REJECTED,
        'staff-principal-1',
        'Not eligible this term',
      );

      expect(result.status).toBe(FeeWaiverStatus.REJECTED);
      expect(result.decidedById).toBe('staff-principal-1');
      expect(result.decidedAt).toBeInstanceOf(Date);
      expect(result.decisionNote).toBe('Not eligible this term');
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(invoiceRepo.save).not.toHaveBeenCalled();
      // The invoice object itself (loaded separately, never touched by the reject path) is untouched.
      expect(invoice.amount).toBe('5000.00');
      expect(invoice.discountAmount).toBe('0.00');
    });

    it('approving a request applies the discount to the linked invoice', async () => {
      const invoice = makeInvoice({ amount: '5000.00', discountAmount: '0.00' });
      const request = makeWaiverRequest({ requestedDiscountAmount: '1000.00' });
      waiverRequestRepo.findOne!.mockResolvedValue(request);
      transactionManager.findOne.mockResolvedValue(invoice);

      const result = await service.decideWaiverRequest(
        'waiver-1',
        FeeWaiverStatus.APPROVED,
        'staff-principal-1',
      );

      expect(result.status).toBe(FeeWaiverStatus.APPROVED);
      expect(result.decidedById).toBe('staff-principal-1');
      expect(result.decidedAt).toBeInstanceOf(Date);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);

      const savedInvoiceCall = transactionManager.save.mock.calls.find(
        (call: unknown[]) => call[0] === InvoiceEntity,
      );
      expect(savedInvoiceCall[1].discountAmount).toBe('1000');
    });

    it('throws ConflictException when deciding an already-decided request', async () => {
      waiverRequestRepo.findOne!.mockResolvedValue(
        makeWaiverRequest({ status: FeeWaiverStatus.APPROVED }),
      );

      await expect(
        service.decideWaiverRequest('waiver-1', FeeWaiverStatus.REJECTED, 'staff-1'),
      ).rejects.toThrow(ConflictException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(waiverRequestRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown request', async () => {
      waiverRequestRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.decideWaiverRequest('missing', FeeWaiverStatus.APPROVED, 'staff-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findWaiverRequests', () => {
    it('returns only pending rows, enriched with student/invoice display fields', async () => {
      waiverRequestRepo.find!.mockResolvedValue([makeWaiverRequest()]);
      studentRepo.findBy!.mockResolvedValue([makeStudent()]);
      invoiceRepo.findBy!.mockResolvedValue([makeInvoice()]);

      const rows = await service.findWaiverRequests(FeeWaiverStatus.PENDING);

      expect(rows).toHaveLength(1);
      expect(rows[0].studentName).toBe('Doe, Jane');
      expect(rows[0].admissionNumber).toBe('A001');
      expect(rows[0].invoiceAmount).toBe(5000);
      expect(rows[0].requestedDiscountAmount).toBe(1000);
      expect(waiverRequestRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: FeeWaiverStatus.PENDING } }),
      );
    });
  });
});
