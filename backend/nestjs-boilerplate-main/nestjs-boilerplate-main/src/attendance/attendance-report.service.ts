import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
// pdfmake 0.2.x uses CommonJS export — must use require() form
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import {
  AttendanceRecordEntity,
  AttendanceStatus,
} from './entities/attendance-record.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { GetAttendanceReportDto } from './dto/get-attendance-report.dto';
import { ExportAttendanceReportDto } from './dto/export-attendance-report.dto';

export interface StudentReportRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  medical: number;
  total: number;
  attendanceRate: number;
}

export interface ReportSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  medical: number;
  total: number;
  attendanceRate: number;
}

export interface AttendanceReportResponse {
  filters: GetAttendanceReportDto;
  summary: ReportSummary;
  rows: StudentReportRow[];
  generatedAt: string;
}

// Built-in Helvetica fonts — no external font files required for server-side pdfmake
const PDF_FONTS: Record<string, TFontFamilyTypes> = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

@Injectable()
export class AttendanceReportService {
  private readonly logger = new Logger(AttendanceReportService.name);

  constructor(
    @InjectRepository(AttendanceRecordEntity)
    private readonly attendanceRepo: Repository<AttendanceRecordEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,
  ) {}

  async getAllClassSections(): Promise<ClassSectionEntity[]> {
    return this.classSectionRepo.find({
      order: { grade: { level: 'ASC' }, name: 'ASC' },
    });
  }

  async generateReport(
    dto: GetAttendanceReportDto,
  ): Promise<AttendanceReportResponse> {
    const { classSectionId, studentId, startDate, endDate } = dto;

    if (!classSectionId && !studentId) {
      throw new BadRequestException(
        'At least one filter (classSectionId or studentId) is required.',
      );
    }

    const where: Record<string, unknown> = {
      date: Between(
        new Date(startDate + 'T00:00:00Z') as unknown as Date,
        new Date(endDate + 'T23:59:59Z') as unknown as Date,
      ),
    };
    if (classSectionId) where.classSectionId = classSectionId;
    if (studentId) where.studentId = studentId;

    const records = await this.attendanceRepo.find({ where });

    const uniqueStudentIds = [...new Set(records.map((r) => r.studentId))];
    const students =
      uniqueStudentIds.length > 0
        ? await this.studentRepo.findBy({ id: In(uniqueStudentIds) })
        : [];

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const rowMap = new Map<string, StudentReportRow>();
    for (const record of records) {
      if (!rowMap.has(record.studentId)) {
        const student = studentMap.get(record.studentId);
        rowMap.set(record.studentId, {
          studentId: record.studentId,
          studentName: student
            ? `${student.firstName} ${student.lastName}`
            : 'Unknown',
          admissionNumber: student?.admissionNumber ?? '',
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          medical: 0,
          total: 0,
          attendanceRate: 0,
        });
      }
      const row = rowMap.get(record.studentId)!;
      switch (record.status) {
        case AttendanceStatus.PRESENT:  row.present++;  break;
        case AttendanceStatus.ABSENT:   row.absent++;   break;
        case AttendanceStatus.LATE:     row.late++;     break;
        case AttendanceStatus.EXCUSED:  row.excused++;  break;
        case AttendanceStatus.MEDICAL:  row.medical++;  break;
      }
      row.total++;
    }

    const rows = [...rowMap.values()]
      .map((row) => ({
        ...row,
        attendanceRate:
          row.total > 0
            ? Math.round(((row.present + row.late) / row.total) * 100)
            : 0,
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));

    const summary = rows.reduce<Omit<ReportSummary, 'attendanceRate'>>(
      (acc, r) => ({
        present: acc.present + r.present,
        absent: acc.absent + r.absent,
        late: acc.late + r.late,
        excused: acc.excused + r.excused,
        medical: acc.medical + r.medical,
        total: acc.total + r.total,
      }),
      { present: 0, absent: 0, late: 0, excused: 0, medical: 0, total: 0 },
    );

    const summaryRate =
      summary.total > 0
        ? Math.round(((summary.present + summary.late) / summary.total) * 100)
        : 0;

    return {
      filters: dto,
      summary: { ...summary, attendanceRate: summaryRate },
      rows,
      generatedAt: new Date().toISOString(),
    };
  }

  async exportExcel(dto: ExportAttendanceReportDto): Promise<Buffer> {
    const t0 = Date.now();
    const report = await this.generateReport(dto);

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'SIMS';
      wb.created = new Date();
      const ws = wb.addWorksheet('Attendance Report');

      // Title row
      ws.mergeCells('A1:J1');
      const titleCell = ws.getCell('A1');
      titleCell.value = `Attendance Report  |  ${dto.startDate} to ${dto.endDate}`;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FF1e293b' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      ws.getRow(1).height = 28;

      // Subtitle row
      ws.mergeCells('A2:J2');
      const subCell = ws.getCell('A2');
      subCell.value = `Generated: ${new Date().toLocaleString('en-LK')}`;
      subCell.font = { size: 10, color: { argb: 'FF64748b' } };
      subCell.alignment = { horizontal: 'left' };
      ws.getRow(2).height = 18;

      ws.addRow([]); // spacer

      // Column widths
      ws.columns = [
        { key: 'no', width: 5 },
        { key: 'studentName', width: 28 },
        { key: 'admissionNumber', width: 16 },
        { key: 'present', width: 10 },
        { key: 'absent', width: 10 },
        { key: 'late', width: 10 },
        { key: 'excused', width: 10 },
        { key: 'medical', width: 10 },
        { key: 'total', width: 10 },
        { key: 'attendanceRate', width: 13 },
      ];

      // Header row
      const headers = [
        '#',
        'Student Name',
        'Admission No.',
        'Present',
        'Absent',
        'Late',
        'Excused',
        'Medical',
        'Total',
        'Rate (%)',
      ];
      const headerRow = ws.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF667eea' },
        };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FF4f46e5' } },
        };
      });
      headerRow.height = 24;

      // Data rows
      report.rows.forEach((row, i) => {
        const dataRow = ws.addRow([
          i + 1,
          row.studentName,
          row.admissionNumber,
          row.present,
          row.absent,
          row.late,
          row.excused,
          row.medical,
          row.total,
          row.attendanceRate,
        ]);

        const bgColor = i % 2 === 0 ? 'FFf8fafc' : 'FFFFFFFF';
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        dataRow.getCell(2).alignment = { horizontal: 'left' };
        dataRow.getCell(3).alignment = { horizontal: 'left' };

        // Conditional colour on Rate cell
        const rateCell = dataRow.getCell(10);
        const rate = row.attendanceRate;
        if (rate < 75) {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFfee2e2' },
          };
          rateCell.font = { color: { argb: 'FFdc2626' }, bold: true };
        } else if (rate < 90) {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFfef9c3' },
          };
          rateCell.font = { color: { argb: 'FF92400e' }, bold: true };
        } else {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFdcfce7' },
          };
          rateCell.font = { color: { argb: 'FF15803d' }, bold: true };
        }
        dataRow.height = 20;
      });

      // Summary row
      const summaryRow = ws.addRow([
        '',
        'TOTAL',
        '',
        report.summary.present,
        report.summary.absent,
        report.summary.late,
        report.summary.excused,
        report.summary.medical,
        report.summary.total,
        report.summary.attendanceRate,
      ]);
      summaryRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFe2e8f0' },
        };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94a3b8' } },
        };
      });
      summaryRow.getCell(2).alignment = { horizontal: 'left' };

      const raw = await wb.xlsx.writeBuffer();
      const buffer = Buffer.from(raw as ArrayBuffer);

      this.logger.log(
        `AttendanceReportService: Excel generated in ${Date.now() - t0}ms`,
      );
      return buffer;
    } catch (err) {
      this.logger.error('AttendanceReportService: Excel generation failed', err);
      throw new InternalServerErrorException(
        'Failed to generate Excel report. Please try again.',
      );
    }
  }

  async exportPdf(dto: ExportAttendanceReportDto): Promise<Buffer> {
    const t0 = Date.now();
    const report = await this.generateReport(dto);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const tableBody: string[][] = [
        [
          '#',
          'Student Name',
          'Adm. No.',
          'Present',
          'Absent',
          'Late',
          'Excused',
          'Medical',
          'Total',
          'Rate %',
        ],
        ...report.rows.map((r, i) => [
          String(i + 1),
          r.studentName,
          r.admissionNumber,
          String(r.present),
          String(r.absent),
          String(r.late),
          String(r.excused),
          String(r.medical),
          String(r.total),
          `${r.attendanceRate}%`,
        ]),
        [
          '',
          'TOTAL',
          '',
          String(report.summary.present),
          String(report.summary.absent),
          String(report.summary.late),
          String(report.summary.excused),
          String(report.summary.medical),
          String(report.summary.total),
          `${report.summary.attendanceRate}%`,
        ],
      ];

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [30, 40, 30, 40],
        content: [
          { text: 'Attendance Report', style: 'title' as string },
          {
            text: `Period: ${dto.startDate} – ${dto.endDate}`,
            style: 'subtitle' as string,
          },
          {
            text: `Generated: ${new Date().toLocaleString('en-LK')}`,
            style: 'meta' as string,
            margin: [0, 0, 0, 12],
          },
          {
            text: [
              { text: 'Total: ', bold: true },
              `${report.summary.total}   `,
              { text: 'Present: ', bold: true },
              `${report.summary.present}   `,
              { text: 'Absent: ', bold: true },
              `${report.summary.absent}   `,
              { text: 'Attendance Rate: ', bold: true },
              `${report.summary.attendanceRate}%`,
            ],
            fontSize: 9,
            margin: [0, 0, 0, 12],
          },
          {
            table: {
              headerRows: 1,
              widths: [
                'auto',
                '*',
                'auto',
                'auto',
                'auto',
                'auto',
                'auto',
                'auto',
                'auto',
                'auto',
              ],
              body: tableBody,
            },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          title: {
            fontSize: 18,
            bold: true,
            color: '#1e293b',
            margin: [0, 0, 0, 4],
          },
          subtitle: { fontSize: 11, color: '#475569', margin: [0, 0, 0, 2] },
          meta: { fontSize: 9, color: '#94a3b8' },
        },
        defaultStyle: { font: 'Helvetica', fontSize: 9 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      });

      this.logger.log(
        `AttendanceReportService: PDF generated in ${Date.now() - t0}ms`,
      );
      return buffer;
    } catch (err) {
      this.logger.error('AttendanceReportService: PDF generation failed', err);
      throw new InternalServerErrorException(
        'Failed to generate PDF report. Please try again.',
      );
    }
  }
}
