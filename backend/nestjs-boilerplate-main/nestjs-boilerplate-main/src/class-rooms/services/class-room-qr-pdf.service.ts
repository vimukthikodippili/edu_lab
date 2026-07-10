import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
// pdfmake 0.2.x uses CommonJS export — must use require() form
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import type { TDocumentDefinitions, TFontFamilyTypes } from 'pdfmake/interfaces';
import { ClassRoomEntity } from '../entities/class-room.entity';
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
export class ClassRoomQrPdfService {
  private readonly logger = new Logger(ClassRoomQrPdfService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async generatePdf(rooms: ClassRoomEntity[]): Promise<Buffer> {
    try {
      const frontendDomain = this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      });

      const qrDataUrls = await Promise.all(
        rooms.map((room) =>
          QRCode.toDataURL(`${frontendDomain}/checkin/room/${room.id}`, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 300,
          }),
        ),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(PDF_FONTS) as {
        createPdfKitDocument: (
          def: TDocumentDefinitions,
          options?: Record<string, unknown>,
        ) => NodeJS.EventEmitter & { end(): void };
      };

      const content: TDocumentDefinitions['content'] = rooms.flatMap(
        (room, index) => [
          {
            text: `Room ${room.roomNumber}`,
            style: 'title' as string,
            ...(index > 0 ? { pageBreak: 'before' as const } : {}),
          },
          {
            text: 'Scan to check in to your current class',
            style: 'subtitle' as string,
            margin: [0, 0, 0, 16],
          },
          {
            image: qrDataUrls[index],
            width: 220,
          },
        ],
      );

      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content,
        styles: {
          title: { fontSize: 20, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
          subtitle: { fontSize: 11, color: '#475569' },
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
      this.logger.error('ClassRoomQrPdfService: PDF generation failed', err);
      throw new InternalServerErrorException('Failed to generate room QR code PDF.');
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
