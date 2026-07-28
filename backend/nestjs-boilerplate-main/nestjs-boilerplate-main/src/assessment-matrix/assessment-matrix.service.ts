import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import { AssessmentMatrixEntryEntity } from './entities/assessment-matrix-entry.entity';

// pdfmake 0.2.x uses CommonJS export — must use require() form (matches AttendanceReportService)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');

export type AgeBand = '5_8' | '9_12' | '13_15' | '16_19';

const AGE_BAND_ORDER: AgeBand[] = ['5_8', '9_12', '13_15', '16_19'];
const AGE_BAND_LABELS: Record<AgeBand, string> = {
  '5_8': 'Age 5-8',
  '9_12': 'Age 9-12',
  '13_15': 'Age 13-15',
  '16_19': 'Age 16-19',
};

export interface AssessmentMatrixRow {
  domainId: string;
  domainCode: string;
  domainName: string;
  bands: Record<AgeBand, boolean>;
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

/** Module 12 (MHA) Story 5 — Recommended Assessment Matrix (SRS Addendum §12.4), AC #19-22.
 * Read-only reference view: 16 of the 21 disorder-registry domains × 4 age bands. */
@Injectable()
export class AssessmentMatrixService {
  private readonly logger = new Logger(AssessmentMatrixService.name);

  constructor(
    @InjectRepository(AssessmentMatrixEntryEntity)
    private readonly repo: Repository<AssessmentMatrixEntryEntity>,
  ) {}

  async getMatrix(): Promise<AssessmentMatrixRow[]> {
    const entries = await this.repo.find({ relations: ['domain'] });

    const byDomain = new Map<string, AssessmentMatrixRow>();
    for (const entry of entries) {
      let row = byDomain.get(entry.domainId);
      if (!row) {
        row = {
          domainId: entry.domainId,
          domainCode: entry.domain.code,
          domainName: entry.domain.name,
          bands: { '5_8': false, '9_12': false, '13_15': false, '16_19': false },
        };
        byDomain.set(entry.domainId, row);
      }
      row.bands[entry.ageBand] = entry.recommended;
    }

    return [...byDomain.values()].sort((a, b) => a.domainCode.localeCompare(b.domainCode));
  }

  async exportPdf(): Promise<Buffer> {
    const rows = await this.getMatrix();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const tableBody: string[][] = [
        ['Domain', ...AGE_BAND_ORDER.map((b) => AGE_BAND_LABELS[b])],
        ...rows.map((r) => [
          `${r.domainName} (${r.domainCode})`,
          ...AGE_BAND_ORDER.map((b) => (r.bands[b] ? '✓' : '–')),
        ]),
      ];

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [30, 40, 30, 40],
        content: [
          { text: 'Recommended Assessment Matrix', style: 'title' as string },
          { text: 'SRS Addendum — Module 12, Section 12.4', style: 'subtitle' as string },
          {
            text: `Generated: ${new Date().toLocaleString('en-LK')}`,
            style: 'meta' as string,
            margin: [0, 0, 0, 12],
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto'],
              body: tableBody,
            },
            layout: 'lightHorizontalLines',
          },
        ],
        styles: {
          title: { fontSize: 18, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
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

      this.logger.log('AssessmentMatrixService: PDF generated');
      return buffer;
    } catch (err) {
      this.logger.error('AssessmentMatrixService: PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate PDF. Please try again.');
    }
  }
}
