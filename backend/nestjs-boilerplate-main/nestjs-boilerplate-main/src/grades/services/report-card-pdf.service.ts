import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
// pdfmake 0.2.x uses CommonJS export — must use require() form
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';
import { AllConfigType } from '../../config/config.type';

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
export class ReportCardPdfService {
  private readonly logger = new Logger(ReportCardPdfService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async generatePdf(
    termResult: TermResultEntity,
    subjectResults: SubjectResultEntity[],
    student: StudentEntity,
  ): Promise<Buffer> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const tableBody: string[][] = [
        ['Subject', 'Total', 'Max', 'Percentage', 'Grade'],
        ...subjectResults.map((sr) => [
          sr.subject?.name ?? sr.subjectId,
          sr.totalScore,
          sr.totalMaxScore,
          sr.percentage !== null ? `${sr.percentage}%` : '—',
          sr.letterGrade ?? '—',
        ]),
      ];

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
          { text: 'Term Report Card', style: 'title' as string },
          {
            text: `${student.firstName} ${student.lastName}  ·  Adm. No. ${student.admissionNumber}`,
            style: 'subtitle' as string,
          },
          {
            text: `Term: ${termResult.term?.name ?? termResult.termId}`,
            style: 'subtitle' as string,
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
          {
            text: [
              { text: 'Total: ', bold: true },
              `${termResult.totalScore} / ${termResult.totalMaxScore}   `,
              { text: 'Percentage: ', bold: true },
              `${termResult.percentage ?? '—'}%   `,
              { text: 'Rank: ', bold: true },
              `${termResult.rank ?? '—'}`,
            ],
            fontSize: 10,
            margin: [0, 16, 0, 0],
          },
          {
            text: `Generated: ${new Date().toLocaleString('en-LK')}`,
            style: 'meta' as string,
            margin: [0, 24, 0, 0],
          },
        ],
        styles: {
          title: { fontSize: 18, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
          subtitle: { fontSize: 11, color: '#475569', margin: [0, 0, 0, 2] },
          meta: { fontSize: 8, color: '#94a3b8' },
        },
        defaultStyle: { font: 'Helvetica', fontSize: 9 },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);
        pdfDoc.end();
      });
    } catch (err) {
      this.logger.error('ReportCardPdfService: PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate report card PDF.');
    }
  }

  async persistAsFile(buffer: Buffer): Promise<FileEntity> {
    const filename = `${randomStringGenerator()}.pdf`;
    const diskPath = path.join('files', filename);
    fs.writeFileSync(diskPath, buffer);

    const apiPrefix = this.configService.get('app.apiPrefix', { infer: true });
    const entity = this.fileRepo.create({
      path: `/${apiPrefix}/v1/files/${filename}`,
    });
    return this.fileRepo.save(entity);
  }
}
