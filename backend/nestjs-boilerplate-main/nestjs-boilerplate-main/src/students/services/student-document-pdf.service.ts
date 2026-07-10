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
import { StudentEntity } from '../entities/student.entity';
import { StudentYearEndNoteEntity } from '../../student-notes/entities/student-year-end-note.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';
import { AllConfigType } from '../../config/config.type';

const PDF_FONTS: Record<string, TFontFamilyTypes> = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

@Injectable()
export class StudentDocumentPdfService {
  private readonly logger = new Logger(StudentDocumentPdfService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async generateCharacterCertificate(
    student: StudentEntity,
    notes: StudentYearEndNoteEntity[],
  ): Promise<Buffer> {
    const sortedNotes = [...notes].sort((a, b) => a.academicYear.localeCompare(b.academicYear));

    const conductParagraphs = sortedNotes
      .filter((n) => n.extracurricularActivities || n.generalRemarks || n.position)
      .map((n) => {
        const parts: string[] = [];
        if (n.position) parts.push(`served as ${n.position}`);
        if (n.extracurricularActivities) parts.push(n.extracurricularActivities);
        if (n.generalRemarks) parts.push(n.generalRemarks);
        return `${n.academicYear}: ${parts.join('. ')}`;
      });

    return this.build(`Character Certificate`, [
      {
        text: `This is to certify that ${student.firstName} ${student.lastName} (Admission No. ${student.admissionNumber}) was a student of this school${student.classSection ? ` and was, at the time of leaving, in ${student.grade.name}, Section ${student.classSection.name}` : ''}.`,
        margin: [0, 0, 0, 12],
      },
      conductParagraphs.length > 0
        ? {
            text: [
              { text: 'Conduct & Activities:\n', bold: true },
              ...conductParagraphs.flatMap((p) => [p, '\n']),
            ],
            margin: [0, 0, 0, 12],
          }
        : {
            text: 'The student maintained good conduct throughout their time at this school.',
            margin: [0, 0, 0, 12],
          },
      {
        text: `Issued: ${new Date().toLocaleDateString('en-LK')}`,
        margin: [0, 24, 0, 40],
      },
      { text: '_________________________', margin: [0, 40, 0, 4] },
      { text: 'Principal', bold: true },
    ]);
  }

  async generateLeavingReport(student: StudentEntity): Promise<Buffer> {
    return this.build(`School Leaving Report`, [
      {
        table: {
          widths: ['*', '*'],
          body: [
            ['Student Name', `${student.firstName} ${student.lastName}`],
            ['Admission Number', student.admissionNumber],
            ['Date of Admission', new Date(student.createdAt).toLocaleDateString('en-LK')],
            ['Date of Leaving', new Date().toLocaleDateString('en-LK')],
            ['Grade / Section at Leaving', `${student.grade.name} — Section ${student.classSection.name}`],
            ['Reason', student.status === 'graduated' ? 'Graduated' : 'Transferred'],
            ...(student.leavingReason ? [['Notes', student.leavingReason]] : []),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 24],
      },
      { text: '_________________________', margin: [0, 40, 0, 4] },
      { text: 'Principal', bold: true },
    ]);
  }

  private async build(title: string, content: TDocumentDefinitions['content']): Promise<Buffer> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [50, 50, 50, 50],
        content: [
          { text: title, style: 'title' as string, margin: [0, 0, 0, 20] },
          ...(Array.isArray(content) ? content : [content]),
        ],
        styles: {
          title: { fontSize: 18, bold: true, color: '#1e293b' },
        },
        defaultStyle: { font: 'Helvetica', fontSize: 10 },
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
      this.logger.error('StudentDocumentPdfService: PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate document PDF.');
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
