import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GradeStageEntity } from './entities/grade-stage.entity';
import { GradeEntity } from './entities/grade.entity';
import { StudentEntity } from './entities/student.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { CreateGradeStageDto } from './dto/create-grade-stage.dto';
import { UpdateGradeStageDto } from './dto/update-grade-stage.dto';

export interface GradeStageWithWarnings extends GradeStageEntity {
  warnings: string[];
}

/** Pure, in-memory version of the level→stage lookup — exported so a batch caller (e.g.
 * TimetableService generating entries for many sections at once) can fetch the stage list a
 * single time via GradeStageService.findAll() and resolve every row against it locally, instead
 * of one findAll() round-trip per row. */
export function resolveStageFromList(
  stages: GradeStageEntity[],
  level: number,
): GradeStageEntity | null {
  return stages.find((s) => level >= s.fromGrade && level <= s.toGrade) ?? null;
}

/** Replaces the hardcoded GradeStage enum — an Admin/Principal can define whatever stage
 * boundaries a school actually uses. Stage membership is always a computed range lookup
 * (resolveStageForLevel), never a stored per-grade FK, so "gaps are allowed" and "a student's
 * grade may fall outside every stage after an edit" are both representable without a stale
 * stored assignment ever going out of sync. */
@Injectable()
export class GradeStageService {
  constructor(
    @InjectRepository(GradeStageEntity)
    private readonly gradeStageRepo: Repository<GradeStageEntity>,

    @InjectRepository(GradeEntity)
    private readonly gradeRepo: Repository<GradeEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,
  ) {}

  async findAll(): Promise<GradeStageEntity[]> {
    return this.gradeStageRepo.find({ order: { ordering: 'ASC' } });
  }

  async findById(id: string): Promise<GradeStageEntity> {
    const stage = await this.gradeStageRepo.findOne({ where: { id } });
    if (!stage) throw new NotFoundException(`Grade stage ${id} not found.`);
    return stage;
  }

  /** The single lookup every downstream consumer (timetable/attendance/teacher-subject-
   * requirements) should use instead of a stored GradeEntity.stage — returns null for a grade
   * level not covered by any stage (a gap), never a guess. */
  async resolveStageForLevel(level: number): Promise<GradeStageEntity | null> {
    const stages = await this.findAll();
    return resolveStageFromList(stages, level);
  }

  async create(dto: CreateGradeStageDto): Promise<GradeStageEntity> {
    this.assertValidRange(dto.fromGrade, dto.toGrade);
    await this.assertNoOverlap(dto.fromGrade, dto.toGrade);

    const maxOrdering = await this.gradeStageRepo
      .createQueryBuilder('gs')
      .select('MAX(gs.ordering)', 'max')
      .getRawOne<{ max: number | null }>();

    const stage = this.gradeStageRepo.create({
      stageName: dto.stageName,
      fromGrade: dto.fromGrade,
      toGrade: dto.toGrade,
      ordering: (maxOrdering?.max ?? -1) + 1,
    });
    return this.gradeStageRepo.save(stage);
  }

  /** Overlap/range validation blocks the save (422); a student now falling outside every stage
   * as a result of the edit only warns — the AC is explicit these are two different severities. */
  async update(id: string, dto: UpdateGradeStageDto): Promise<GradeStageWithWarnings> {
    const stage = await this.findById(id);

    const fromGrade = dto.fromGrade ?? stage.fromGrade;
    const toGrade = dto.toGrade ?? stage.toGrade;
    this.assertValidRange(fromGrade, toGrade);
    await this.assertNoOverlap(fromGrade, toGrade, id);

    if (dto.stageName !== undefined) stage.stageName = dto.stageName;
    stage.fromGrade = fromGrade;
    stage.toGrade = toGrade;

    const saved = await this.gradeStageRepo.save(stage);
    const warnings = await this.computeOrphanWarnings();
    return { ...saved, warnings };
  }

  /** "Only if no students or classes are currently assigned to it" — two separate checks, per
   * the literal AC wording. */
  async delete(id: string): Promise<void> {
    const stage = await this.findById(id);

    const gradeIds = await this.gradeIdsInRange(stage.fromGrade, stage.toGrade);
    if (gradeIds.length > 0) {
      const [studentCount, sectionCount] = await Promise.all([
        this.studentRepo.count({ where: { gradeId: In(gradeIds) } }),
        this.classSectionRepo.count({ where: { gradeId: In(gradeIds) } }),
      ]);
      if (studentCount > 0) {
        throw new ConflictException(
          `Cannot delete this grade stage — ${studentCount} student(s) are currently in it.`,
        );
      }
      if (sectionCount > 0) {
        throw new ConflictException(
          `Cannot delete this grade stage — ${sectionCount} class section(s) are currently in it.`,
        );
      }
    }

    await this.gradeStageRepo.delete(id);
  }

  async reorder(orderedIds: string[]): Promise<GradeStageEntity[]> {
    const stages = await this.findAll();
    const idSet = new Set(stages.map((s) => s.id));
    for (const id of orderedIds) {
      if (!idSet.has(id)) throw new NotFoundException(`Grade stage ${id} not found.`);
    }

    await Promise.all(
      orderedIds.map((id, index) => this.gradeStageRepo.update(id, { ordering: index })),
    );
    return this.findAll();
  }

  private assertValidRange(fromGrade: number, toGrade: number): void {
    if (fromGrade > toGrade) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { toGrade: 'toGrade must be greater than or equal to fromGrade.' },
      });
    }
  }

  private async assertNoOverlap(
    fromGrade: number,
    toGrade: number,
    excludeId?: string,
  ): Promise<void> {
    const others = (await this.findAll()).filter((s) => s.id !== excludeId);
    const overlapping = others.find((s) => fromGrade <= s.toGrade && toGrade >= s.fromGrade);
    if (overlapping) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          fromGrade: `Grade range ${fromGrade}-${toGrade} overlaps with existing stage '${overlapping.stageName}' (${overlapping.fromGrade}-${overlapping.toGrade}).`,
        },
      });
    }
  }

  private async gradeIdsInRange(fromGrade: number, toGrade: number): Promise<number[]> {
    const grades = await this.gradeRepo
      .createQueryBuilder('g')
      .where('g.level BETWEEN :from AND :to', { from: fromGrade, to: toGrade })
      .getMany();
    return grades.map((g) => g.id);
  }

  private async computeOrphanWarnings(): Promise<string[]> {
    const enrolledGradeIds = await this.studentRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.gradeId', 'gradeId')
      .getRawMany<{ gradeId: number }>();

    if (enrolledGradeIds.length === 0) return [];

    const grades = await this.gradeRepo.find({
      where: { id: In(enrolledGradeIds.map((r) => r.gradeId)) },
    });

    const stages = await this.findAll();
    const warnings: string[] = [];
    for (const grade of grades) {
      if (!resolveStageFromList(stages, grade.level)) {
        warnings.push(
          `Students in ${grade.name} are not covered by any grade stage after this change.`,
        );
      }
    }
    return warnings;
  }
}
