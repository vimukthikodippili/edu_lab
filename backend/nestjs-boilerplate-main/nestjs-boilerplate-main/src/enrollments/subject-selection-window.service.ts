import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SubjectSelectionWindowEntity } from './entities/subject-selection-window.entity';
import {
  SubjectSelectionWindowCoreSubjectEntity,
  SubjectSelectionWindowOptionalSubjectEntity,
} from './entities/subject-selection-window-subject.entity';
import { CreateSubjectSelectionWindowDto } from './dto/create-subject-selection-window.dto';
import { UpdateSubjectSelectionWindowDto } from './dto/update-subject-selection-window.dto';
import { SetWindowSubjectsDto } from './dto/set-window-subjects.dto';

@Injectable()
export class SubjectSelectionWindowService {
  constructor(
    @InjectRepository(SubjectSelectionWindowEntity)
    private readonly windowRepo: Repository<SubjectSelectionWindowEntity>,
    @InjectRepository(SubjectSelectionWindowCoreSubjectEntity)
    private readonly coreSubjectRepo: Repository<SubjectSelectionWindowCoreSubjectEntity>,
    @InjectRepository(SubjectSelectionWindowOptionalSubjectEntity)
    private readonly optionalSubjectRepo: Repository<SubjectSelectionWindowOptionalSubjectEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateSubjectSelectionWindowDto): Promise<SubjectSelectionWindowEntity> {
    const window = this.windowRepo.create({
      gradeStageId: dto.gradeStageId,
      academicYear: String(dto.academicYear),
      openDate: new Date(dto.openDate),
      closeDate: new Date(dto.closeDate),
      minOptionalSubjects: dto.minOptionalSubjects,
      maxOptionalSubjects: dto.maxOptionalSubjects,
      requiresStreamSelection: dto.requiresStreamSelection ?? false,
    });
    return this.windowRepo.save(window);
  }

  async findAll(): Promise<SubjectSelectionWindowEntity[]> {
    return this.windowRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<SubjectSelectionWindowEntity> {
    const window = await this.windowRepo.findOne({ where: { id } });
    if (!window) throw new NotFoundException(`Subject selection window ${id} not found.`);
    return window;
  }

  async update(id: string, dto: UpdateSubjectSelectionWindowDto): Promise<SubjectSelectionWindowEntity> {
    const window = await this.findById(id);
    if (dto.openDate !== undefined) window.openDate = new Date(dto.openDate);
    if (dto.closeDate !== undefined) window.closeDate = new Date(dto.closeDate);
    if (dto.minOptionalSubjects !== undefined) window.minOptionalSubjects = dto.minOptionalSubjects;
    if (dto.maxOptionalSubjects !== undefined) window.maxOptionalSubjects = dto.maxOptionalSubjects;
    if (dto.requiresStreamSelection !== undefined) window.requiresStreamSelection = dto.requiresStreamSelection;
    if (dto.isActive !== undefined) window.isActive = dto.isActive;
    return this.windowRepo.save(window);
  }

  async toggleActive(id: string): Promise<SubjectSelectionWindowEntity> {
    const window = await this.findById(id);
    window.isActive = !window.isActive;
    return this.windowRepo.save(window);
  }

  async getCoreSubjects(windowId: string): Promise<SubjectSelectionWindowCoreSubjectEntity[]> {
    await this.findById(windowId);
    return this.coreSubjectRepo.find({ where: { windowId } });
  }

  async getOptionalSubjects(windowId: string): Promise<SubjectSelectionWindowOptionalSubjectEntity[]> {
    await this.findById(windowId);
    return this.optionalSubjectRepo.find({ where: { windowId } });
  }

  async setCoreSubjects(
    windowId: string,
    dto: SetWindowSubjectsDto,
  ): Promise<SubjectSelectionWindowCoreSubjectEntity[]> {
    await this.findById(windowId);
    await this.dataSource.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .delete()
        .from(SubjectSelectionWindowCoreSubjectEntity)
        .where('"windowId" = :windowId', { windowId })
        .execute();
      if (dto.subjectIds.length > 0) {
        const rows = dto.subjectIds.map((subjectId) =>
          em.create(SubjectSelectionWindowCoreSubjectEntity, { windowId, subjectId }),
        );
        await em.save(SubjectSelectionWindowCoreSubjectEntity, rows);
      }
    });
    return this.getCoreSubjects(windowId);
  }

  async setOptionalSubjects(
    windowId: string,
    dto: SetWindowSubjectsDto,
  ): Promise<SubjectSelectionWindowOptionalSubjectEntity[]> {
    await this.findById(windowId);
    await this.dataSource.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .delete()
        .from(SubjectSelectionWindowOptionalSubjectEntity)
        .where('"windowId" = :windowId', { windowId })
        .execute();
      if (dto.subjectIds.length > 0) {
        const rows = dto.subjectIds.map((subjectId) =>
          em.create(SubjectSelectionWindowOptionalSubjectEntity, { windowId, subjectId }),
        );
        await em.save(SubjectSelectionWindowOptionalSubjectEntity, rows);
      }
    });
    return this.getOptionalSubjects(windowId);
  }

  /** The query the student-facing endpoint needs: a window is only really "open" when the
   * manual toggle is on AND the current time falls within its declared date range. */
  async findActiveWindowForGradeStage(gradeStageId: string): Promise<SubjectSelectionWindowEntity | null> {
    const now = new Date();
    return this.windowRepo
      .createQueryBuilder('w')
      .where('w.gradeStageId = :gradeStageId', { gradeStageId })
      .andWhere('w.isActive = true')
      .andWhere('w.openDate <= :now', { now })
      .andWhere('w.closeDate >= :now', { now })
      .getOne();
  }
}
