import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExamEntity } from './entities/exam.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { CreateExamDto } from './dto/create-exam.dto';

/** P5-EH — FR-P5-EH-04. Fills the gap Phase 1 left: no literal `Exam` entity exists there, only
 * the single-class-section `AssessmentEntity`. Section Head access is grade-range scoped and
 * fail-closed, mirroring `sports.service.ts`/`late-alert.service.ts`'s established
 * `resolveSectionHeadGradeRange` convention exactly (not the Grades module's coarser
 * role-only check) — an unconfigured range means nothing is allowed, never "unfiltered." */
@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(ExamEntity)
    private readonly examRepo: Repository<ExamEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
  ) {}

  async create(
    dto: CreateExamDto,
    actorStaffId: string,
    isFullyPrivileged: boolean,
    isSectionHead: boolean,
  ): Promise<ExamEntity> {
    if (!isFullyPrivileged) {
      await this.assertSectionHeadCanActOnGrade(actorStaffId, isSectionHead, dto.gradeId);
    }
    const exam = this.examRepo.create({ ...dto, createdByStaffId: actorStaffId });
    return this.examRepo.save(exam);
  }

  async findAll(): Promise<ExamEntity[]> {
    return this.examRepo.find({ order: { date: 'DESC' } });
  }

  async getById(id: string): Promise<ExamEntity> {
    const exam = await this.examRepo.findOne({ where: { id } });
    if (!exam) {
      throw new NotFoundException(`Exam ${id} not found.`);
    }
    return exam;
  }

  /** Reused by ExamSeatAllocationService for the allocate/override actions — same fail-closed
   * grade-range convention, scoped to a single gradeId rather than a range query since
   * ExamEntity.gradeId is already a direct scalar (no join needed). */
  async assertSectionHeadCanActOnGrade(
    staffId: string,
    isSectionHead: boolean,
    gradeId: number,
  ): Promise<void> {
    if (!isSectionHead) {
      throw new ForbiddenException('You are not authorized to act on this exam.');
    }
    const range = await this.resolveSectionHeadGradeRange(staffId);
    if (!range || gradeId < range.from || gradeId > range.to) {
      throw new ForbiddenException('This exam is outside your configured grade range.');
    }
  }

  private async resolveSectionHeadGradeRange(
    staffId: string,
  ): Promise<{ from: number; to: number } | null> {
    const staff = await this.staffRepo.findOne({ where: { id: staffId } });
    if (staff?.sectionHeadGradeFrom == null || staff?.sectionHeadGradeTo == null) {
      return null;
    }
    return { from: staff.sectionHeadGradeFrom, to: staff.sectionHeadGradeTo };
  }
}
