import { Controller, Get, HttpCode, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { AssessmentMatrixService } from './assessment-matrix.service';

/** Module 12 (MHA) Story 5 — Recommended Assessment Matrix, AC #19-22. Roles deliberately match
 * the AI prompt's literal "Counselor/SchoolPsychologist/Admin" — narrower than disorder-registry's
 * read routes (no principal/teacher). */
@ApiTags('MHA — Assessment Matrix')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'assessment-matrix', version: '1' })
export class AssessmentMatrixController {
  constructor(private readonly matrixService: AssessmentMatrixService) {}

  @Get()
  @Roles(RoleEnum.admin, RoleEnum.counselor, RoleEnum.school_psychologist)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recommended Assessment Matrix — 16 domains × 4 age bands (SRS Addendum §12.4)' })
  async findAll() {
    return this.matrixService.getMatrix();
  }

  @Get('export')
  @Roles(RoleEnum.admin, RoleEnum.counselor, RoleEnum.school_psychologist)
  @ApiOperation({ summary: 'Export the Assessment Matrix as PDF' })
  async exportPdf(@Res() res: Response): Promise<void> {
    try {
      const buffer = await this.matrixService.exportPdf();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="assessment-matrix.pdf"');
      res.send(buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message });
    }
  }
}
