import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultsPublishedEvent } from '../events/results-published.event';
import { ReportCardPdfService } from '../services/report-card-pdf.service';
import { TermResultEntity } from '../entities/term-result.entity';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { StudentEntity } from '../../students/entities/student.entity';

@Injectable()
export class ReportCardGenerationListener {
  private readonly logger = new Logger(ReportCardGenerationListener.name);

  constructor(
    private readonly reportCardPdfService: ReportCardPdfService,
    @InjectRepository(TermResultEntity)
    private readonly termResultRepo: Repository<TermResultEntity>,
    @InjectRepository(SubjectResultEntity)
    private readonly subjectResultRepo: Repository<SubjectResultEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  @OnEvent('results.published', { async: true })
  async handle(event: ResultsPublishedEvent): Promise<void> {
    try {
      const outcomes = await Promise.allSettled(
        event.studentIds.map((studentId) =>
          this.generateForStudent(studentId, event.termId),
        ),
      );

      outcomes.forEach((outcome, idx) => {
        if (outcome.status === 'rejected') {
          this.logger.error(
            `Failed to generate report card for student ${event.studentIds[idx]}: ${outcome.reason}`,
          );
        }
      });
    } catch (err) {
      this.logger.error(
        `Unexpected error processing results.published event ${JSON.stringify(event)}: ${err}`,
      );
    }
  }

  private async generateForStudent(
    studentId: string,
    termId: number,
  ): Promise<void> {
    const termResult = await this.termResultRepo.findOne({
      where: { studentId, termId },
    });
    if (!termResult) return;

    const subjectResults = await this.subjectResultRepo.find({
      where: { studentId, termId },
    });
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) return;

    const buffer = await this.reportCardPdfService.generatePdf(
      termResult,
      subjectResults,
      student,
    );
    const file = await this.reportCardPdfService.persistAsFile(buffer);

    termResult.reportCardFileId = file.id;
    await this.termResultRepo.save(termResult);
  }
}
