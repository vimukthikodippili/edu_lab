import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { RolesGuard } from '../roles/roles.guard';
import { ExamHallPdfService } from './exam-hall-pdf.service';

/** P5-EH-2 — FR-P5-EH-13/14. Stream-only response (not persisted as a `FileEntity`), matching
 * `attendance-report.service.ts`'s convention for a same-session "print now" document — unlike
 * admit cards, nobody needs to re-fetch a hall's seating plan later per student. */
@ApiTags('Exam Halls — Printable Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'exams', version: '1' })
export class ExamHallPdfController {
  constructor(private readonly pdfService: ExamHallPdfService) {}

  @Get(':examId/halls/:examHallId/seating-plan/pdf')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @ApiOperation({ summary: 'Download the printable seating plan grid for this hall' })
  async seatingPlan(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Param('examHallId', new ParseUUIDPipe({ version: '4' })) examHallId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const buffer = await this.pdfService.generateSeatingPlanPdf(examId, examHallId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="seating-plan-${examHallId}.pdf"`);
      res.send(buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message });
    }
  }

  @Get(':examId/halls/:examHallId/entry-list/pdf')
  @Roles(RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head)
  @ApiOperation({ summary: 'Download the alphabetical entry list for this hall' })
  async entryList(
    @Param('examId', new ParseUUIDPipe({ version: '4' })) examId: string,
    @Param('examHallId', new ParseUUIDPipe({ version: '4' })) examHallId: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const buffer = await this.pdfService.generateEntryListPdf(examId, examHallId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="entry-list-${examHallId}.pdf"`);
      res.send(buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message });
    }
  }
}
