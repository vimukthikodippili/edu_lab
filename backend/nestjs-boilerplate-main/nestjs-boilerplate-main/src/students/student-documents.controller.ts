import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { StudentsService } from './students.service';
import { StudentDocumentsService } from './services/student-documents.service';
import { StudentDocumentPdfService } from './services/student-document-pdf.service';
import { StudentDocumentType } from './entities/student-document.entity';
import { StudentNotesService } from '../student-notes/student-notes.service';

@ApiTags('Student Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'students', version: '1' })
export class StudentDocumentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentNotesService: StudentNotesService,
    private readonly documentsService: StudentDocumentsService,
    private readonly pdfService: StudentDocumentPdfService,
  ) {}

  @Get(':id/documents')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.OK)
  async getDocumentsForReview(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const [notes, documents] = await Promise.all([
      this.studentNotesService.getNotesForStudent(id, null),
      this.documentsService.listForStudent(id),
    ]);
    return { notes, documents };
  }

  @Post(':id/documents/character-certificate')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  async generateCharacterCertificate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: number } },
  ) {
    const student = await this.studentsService.findById(id);
    const notes = await this.studentNotesService.getNotesForStudent(id, null);
    const buffer = await this.pdfService.generateCharacterCertificate(student, notes);
    const file = await this.pdfService.persistAsFile(buffer);
    const document = await this.documentsService.recordIssued(
      id,
      StudentDocumentType.CHARACTER_CERTIFICATE,
      file.id,
      req.user.id,
    );
    return { url: file.path, document };
  }

  @Post(':id/documents/leaving-report')
  @Roles(RoleEnum.admin, RoleEnum.principal)
  @HttpCode(HttpStatus.CREATED)
  async generateLeavingReport(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: { user: { id: number } },
  ) {
    const student = await this.studentsService.findById(id);
    const buffer = await this.pdfService.generateLeavingReport(student);
    const file = await this.pdfService.persistAsFile(buffer);
    const document = await this.documentsService.recordIssued(
      id,
      StudentDocumentType.LEAVING_REPORT,
      file.id,
      req.user.id,
    );
    return { url: file.path, document };
  }
}
