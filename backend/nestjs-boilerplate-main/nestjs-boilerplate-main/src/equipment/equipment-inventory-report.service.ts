import { ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
// pdfmake 0.2.x uses CommonJS export — must use require() form
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import { EquipmentEntity } from './entities/equipment.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { GetEquipmentReportDto } from './dto/get-equipment-report.dto';
import { ExportEquipmentReportDto } from './dto/export-equipment-report.dto';

export interface EquipmentReportRow {
  labName: string;
  equipmentName: string;
  category: string;
  quantity: number;
  unit: string;
  condition: string;
  serialNumber: string;
  purchaseDate: string;
  minStockLevel: number | null;
  lowStock: boolean;
}

export interface EquipmentReportResponse {
  rows: EquipmentReportRow[];
  generatedAt: string;
}

// Built-in Helvetica fonts — no external font files required for server-side pdfmake.
const PDF_FONTS: Record<string, TFontFamilyTypes> = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

@Injectable()
export class EquipmentInventoryReportService {
  private readonly logger = new Logger(EquipmentInventoryReportService.name);

  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepo: Repository<EquipmentEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,
  ) {}

  async generateReport(
    dto: GetEquipmentReportDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<EquipmentReportResponse> {
    let labIds: string[];

    if (dto.labId) {
      const lab = await this.labRepo.findOne({ where: { id: dto.labId } });
      if (!lab) throw new NotFoundException(`Lab ${dto.labId} not found.`);
      if (!isPrivileged && lab.labInChargeId !== staffId) {
        throw new ForbiddenException('You are not the Lab In-Charge for this lab.');
      }
      labIds = [dto.labId];
    } else if (isPrivileged) {
      labIds = (await this.labRepo.find()).map((l) => l.id);
    } else {
      labIds = (await this.labRepo.find({ where: { labInChargeId: staffId } })).map((l) => l.id);
    }

    if (labIds.length === 0) {
      return { rows: [], generatedAt: new Date().toISOString() };
    }

    const items = await this.equipmentRepo.find({
      where: { labId: In(labIds) },
      order: { name: 'ASC' },
    });
    const labs = await this.labRepo.find({ where: { id: In(labIds) } });
    const labMap = new Map(labs.map((l) => [l.id, l]));

    const rows: EquipmentReportRow[] = items.map((item) => ({
      labName: labMap.get(item.labId)?.name ?? 'Unknown',
      equipmentName: item.name,
      category: item.category.name,
      quantity: item.quantity,
      unit: item.unit,
      condition: item.condition,
      serialNumber: item.serialNumber ?? '',
      purchaseDate: item.purchaseDate,
      minStockLevel: item.minStockLevel,
      lowStock: item.minStockLevel != null && item.quantity <= item.minStockLevel,
    }));

    return { rows, generatedAt: new Date().toISOString() };
  }

  async exportExcel(dto: ExportEquipmentReportDto, staffId: string, isPrivileged: boolean): Promise<Buffer> {
    const t0 = Date.now();
    const report = await this.generateReport(dto, staffId, isPrivileged);

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'SIMS';
      wb.created = new Date();
      const ws = wb.addWorksheet('Equipment Inventory');

      ws.mergeCells('A1:J1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'Equipment Inventory Report';
      titleCell.font = { bold: true, size: 14, color: { argb: 'FF1e293b' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      ws.getRow(1).height = 28;

      ws.mergeCells('A2:J2');
      const subCell = ws.getCell('A2');
      subCell.value = `Generated: ${new Date().toLocaleString('en-LK')}`;
      subCell.font = { size: 10, color: { argb: 'FF64748b' } };
      ws.getRow(2).height = 18;

      ws.addRow([]);

      ws.columns = [
        { key: 'no', width: 5 },
        { key: 'lab', width: 20 },
        { key: 'name', width: 26 },
        { key: 'category', width: 16 },
        { key: 'quantity', width: 10 },
        { key: 'unit', width: 10 },
        { key: 'condition', width: 12 },
        { key: 'serialNumber', width: 18 },
        { key: 'purchaseDate', width: 14 },
        { key: 'lowStock', width: 12 },
      ];

      const headerRow = ws.addRow([
        '#', 'Lab', 'Equipment Name', 'Category', 'Quantity', 'Unit', 'Condition', 'Serial Number', 'Purchase Date', 'Low Stock',
      ]);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06b6d4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF0891b2' } } };
      });
      headerRow.height = 24;

      const CONDITION_COLORS: Record<string, string> = {
        good: 'FFdcfce7',
        fair: 'FFfef9c3',
        poor: 'FFfee2e2',
      };

      report.rows.forEach((row, i) => {
        const dataRow = ws.addRow([
          i + 1, row.labName, row.equipmentName, row.category, row.quantity, row.unit,
          row.condition, row.serialNumber, row.purchaseDate, row.lowStock ? 'Yes' : 'No',
        ]);
        const bgColor = i % 2 === 0 ? 'FFf8fafc' : 'FFFFFFFF';
        dataRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        dataRow.getCell(2).alignment = { horizontal: 'left' };
        dataRow.getCell(3).alignment = { horizontal: 'left' };

        const conditionCell = dataRow.getCell(7);
        conditionCell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: CONDITION_COLORS[row.condition] ?? 'FFf8fafc' },
        };

        if (row.lowStock) {
          const lowStockCell = dataRow.getCell(10);
          lowStockCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFfee2e2' } };
          lowStockCell.font = { color: { argb: 'FFdc2626' }, bold: true };
        }
        dataRow.height = 20;
      });

      const raw = await wb.xlsx.writeBuffer();
      const buffer = Buffer.from(raw as ArrayBuffer);
      this.logger.log(`EquipmentInventoryReportService: Excel generated in ${Date.now() - t0}ms`);
      return buffer;
    } catch (err) {
      this.logger.error('EquipmentInventoryReportService: Excel generation failed', err);
      throw new InternalServerErrorException('Failed to generate Excel report. Please try again.');
    }
  }

  async exportPdf(dto: ExportEquipmentReportDto, staffId: string, isPrivileged: boolean): Promise<Buffer> {
    const t0 = Date.now();
    const report = await this.generateReport(dto, staffId, isPrivileged);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const tableBody: string[][] = [
        ['#', 'Lab', 'Equipment Name', 'Category', 'Qty', 'Unit', 'Condition', 'Serial No.', 'Purchase Date', 'Low Stock'],
        ...report.rows.map((r, i) => [
          String(i + 1), r.labName, r.equipmentName, r.category, String(r.quantity), r.unit,
          r.condition, r.serialNumber, r.purchaseDate, r.lowStock ? 'Yes' : 'No',
        ]),
      ];

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [30, 40, 30, 40],
        content: [
          { text: 'Equipment Inventory Report', style: 'title' as string },
          { text: `Generated: ${new Date().toLocaleString('en-LK')}`, style: 'meta' as string, margin: [0, 0, 0, 12] },
          {
            table: {
              headerRows: 1,
              widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: tableBody,
            },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          title: { fontSize: 18, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
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

      this.logger.log(`EquipmentInventoryReportService: PDF generated in ${Date.now() - t0}ms`);
      return buffer;
    } catch (err) {
      this.logger.error('EquipmentInventoryReportService: PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate PDF report. Please try again.');
    }
  }
}
