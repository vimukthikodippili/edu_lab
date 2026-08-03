import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
// pdfmake 0.2.x uses CommonJS export — must use require() form
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import { ExamEntity } from './entities/exam.entity';
import { ExamHallEntity } from './entities/exam-hall.entity';
import { ExamSeatEntity } from './entities/exam-seat.entity';
import { ExamSeatAllocationEntity } from './entities/exam-seat-allocation.entity';
import { StudentEntity } from '../students/entities/student.entity';

export interface SeatingGridCell {
  seatLabel: string;
  studentName: string | null;
  admissionNumber: string | null;
}

const PDF_FONTS: Record<string, TFontFamilyTypes> = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

/** P5-EH-2 — FR-P5-EH-13/14. Reuses the established `pdfmake` scaffolding from
 * `attendance-report.service.ts` (Helvetica-only, `createPdfKitDocument` → Buffer via a Promise
 * wrapping the stream events). "Index number" reuses `StudentEntity.admissionNumber` — no
 * separate per-sitting index-number concept exists in this codebase (see plan). `buildSeatingGrid`
 * is deliberately pure/synchronous and separate from the pdfmake rendering step so the AI-prompt's
 * "grid layout correctness" test doesn't need to parse rendered PDF bytes. */
@Injectable()
export class ExamHallPdfService {
  private readonly logger = new Logger(ExamHallPdfService.name);

  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepo: Repository<ExamEntity>,

    @InjectRepository(ExamHallEntity)
    private readonly hallRepo: Repository<ExamHallEntity>,

    @InjectRepository(ExamSeatEntity)
    private readonly seatRepo: Repository<ExamSeatEntity>,

    @InjectRepository(ExamSeatAllocationEntity)
    private readonly allocationRepo: Repository<ExamSeatAllocationEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  /** Pure data-shaping — every grid coordinate always has a cell (seats are auto-generated 1:1
   * with the hall's rowCount×columnCount at hall-creation time); `studentName`/`admissionNumber`
   * are `null` for a seat with no allocation yet. */
  buildSeatingGrid(
    hall: ExamHallEntity,
    seats: ExamSeatEntity[],
    allocations: ExamSeatAllocationEntity[],
    students: StudentEntity[],
  ): SeatingGridCell[][] {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const allocationBySeatId = new Map(allocations.map((a) => [a.examSeatId, a]));

    const grid: SeatingGridCell[][] = Array.from({ length: hall.rowCount }, () =>
      Array.from({ length: hall.columnCount }, () => ({ seatLabel: '', studentName: null, admissionNumber: null })),
    );

    for (const seat of seats) {
      const rowIndex = seat.rowNumber - 1;
      const colIndex = seat.columnNumber - 1;
      if (rowIndex < 0 || rowIndex >= hall.rowCount || colIndex < 0 || colIndex >= hall.columnCount) continue;

      const allocation = allocationBySeatId.get(seat.id);
      const student = allocation ? studentMap.get(allocation.studentId) : undefined;
      grid[rowIndex][colIndex] = {
        seatLabel: seat.seatLabel,
        studentName: student ? `${student.firstName} ${student.lastName}` : null,
        admissionNumber: student?.admissionNumber ?? null,
      };
    }

    return grid;
  }

  async generateSeatingPlanPdf(examId: string, examHallId: string): Promise<Buffer> {
    const { exam, hall, seats, allocations, students } = await this.loadHallData(examId, examHallId);
    const grid = this.buildSeatingGrid(hall, seats, allocations, students);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const tableBody = grid.map((row) =>
        row.map((cell) => ({
          stack: [
            { text: cell.seatLabel, bold: true, fontSize: 9 },
            { text: cell.studentName ?? '(empty)', fontSize: 7, color: cell.studentName ? '#1e293b' : '#94a3b8' },
            { text: cell.admissionNumber ? `Index: ${cell.admissionNumber}` : '', fontSize: 6, color: '#64748b' },
          ],
          margin: [2, 2, 2, 2] as [number, number, number, number],
        })),
      );

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [30, 40, 30, 30],
        content: [
          { text: `${hall.name} — Seating Plan`, style: 'title' as string },
          { text: `${exam.name}  |  ${exam.date}  |  ${exam.startTime}–${exam.endTime}`, style: 'subtitle' as string, margin: [0, 0, 0, 12] },
          {
            table: {
              headerRows: 0,
              widths: new Array(hall.columnCount).fill('*'),
              body: tableBody,
            },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          title: { fontSize: 16, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
          subtitle: { fontSize: 10, color: '#475569' },
        },
        defaultStyle: { font: 'Helvetica', fontSize: 8 },
      };

      return await this.renderPdf(printer, docDefinition);
    } catch (err) {
      this.logger.error('ExamHallPdfService: seating plan PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate seating plan PDF. Please try again.');
    }
  }

  async generateEntryListPdf(examId: string, examHallId: string): Promise<Buffer> {
    const { exam, hall, seats, allocations, students } = await this.loadHallData(examId, examHallId);
    const seatMap = new Map(seats.map((s) => [s.id, s]));
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const rows = allocations
      .map((allocation) => {
        const student = studentMap.get(allocation.studentId);
        const seat = seatMap.get(allocation.examSeatId);
        return {
          name: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          admissionNumber: student?.admissionNumber ?? '-',
          seatLabel: seat?.seatLabel ?? '-',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const tableBody: string[][] = [
        ['#', 'Student Name', 'Index No.', 'Seat'],
        ...rows.map((r, i) => [String(i + 1), r.name, r.admissionNumber, r.seatLabel]),
      ];

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
          { text: `${hall.name} — Entry List`, style: 'title' as string },
          { text: `${exam.name}  |  ${exam.date}  |  ${exam.startTime}–${exam.endTime}`, style: 'subtitle' as string, margin: [0, 0, 0, 12] },
          {
            table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto'], body: tableBody },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          title: { fontSize: 16, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
          subtitle: { fontSize: 10, color: '#475569' },
        },
        defaultStyle: { font: 'Helvetica', fontSize: 9 },
      };

      return await this.renderPdf(printer, docDefinition);
    } catch (err) {
      this.logger.error('ExamHallPdfService: entry list PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate entry list PDF. Please try again.');
    }
  }

  private async loadHallData(examId: string, examHallId: string) {
    const [exam, hall] = await Promise.all([
      this.examRepo.findOne({ where: { id: examId } }),
      this.hallRepo.findOne({ where: { id: examHallId } }),
    ]);
    if (!exam) throw new NotFoundException(`Exam ${examId} not found.`);
    if (!hall) throw new NotFoundException(`Exam hall ${examHallId} not found.`);

    const [seats, allocations] = await Promise.all([
      this.seatRepo.find({ where: { examHallId } }),
      this.allocationRepo.find({ where: { examId, examHallId } }),
    ]);
    const students = allocations.length
      ? await this.studentRepo.find({ where: { id: In(allocations.map((a) => a.studentId)) } })
      : [];

    return { exam, hall, seats, allocations, students };
  }

  private renderPdf(
    printer: { createPdfKitDocument: (def: TDocumentDefinitions, options?: Record<string, unknown>) => NodeJS.EventEmitter & { end(): void } },
    docDefinition: TDocumentDefinitions,
  ): Promise<Buffer> {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}
