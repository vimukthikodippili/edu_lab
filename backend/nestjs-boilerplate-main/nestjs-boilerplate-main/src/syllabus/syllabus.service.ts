import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SyllabusUnitEntity } from './entities/syllabus-unit.entity';
import { CreateSyllabusUnitDto } from './dto/create-syllabus-unit.dto';
import { UpdateSyllabusUnitDto } from './dto/update-syllabus-unit.dto';
import { QuerySyllabusUnitDto } from './dto/query-syllabus-unit.dto';
import { ReorderSyllabusUnitsDto } from './dto/reorder-syllabus-units.dto';
import { CopyFromYearDto } from './dto/copy-from-year.dto';

@Injectable()
export class SyllabusService {
  private readonly logger = new Logger(SyllabusService.name);

  constructor(
    @InjectRepository(SyllabusUnitEntity)
    private readonly unitRepo: Repository<SyllabusUnitEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QuerySyllabusUnitDto): Promise<SyllabusUnitEntity[]> {
    const qb = this.unitRepo
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.subject', 'subject')
      .leftJoinAndSelect('unit.grade', 'grade')
      .orderBy('unit.order', 'ASC');

    if (query.subjectId) qb.andWhere('unit.subjectId = :subjectId', { subjectId: query.subjectId });
    if (query.gradeId) qb.andWhere('unit.gradeId = :gradeId', { gradeId: query.gradeId });
    if (query.academicYear) qb.andWhere('unit.academicYear = :academicYear', { academicYear: query.academicYear });

    return qb.getMany();
  }

  async create(dto: CreateSyllabusUnitDto): Promise<SyllabusUnitEntity> {
    try {
      const unit = this.unitRepo.create(dto);
      return await this.unitRepo.save(unit);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(
          `A lesson with order ${dto.order} already exists for this subject/grade/year.`,
        );
      }
      this.logger.error('SyllabusService.create failed', err instanceof Error ? err.stack : String(err));
      throw new InternalServerErrorException('Could not create syllabus unit.');
    }
  }

  async update(id: string, dto: UpdateSyllabusUnitDto): Promise<SyllabusUnitEntity> {
    const unit = await this.unitRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException(`Syllabus unit ${id} not found.`);

    try {
      Object.assign(unit, dto);
      return await this.unitRepo.save(unit);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException(`Order ${dto.order} is already taken in this subject/grade/year.`);
      }
      this.logger.error('SyllabusService.update failed', err instanceof Error ? err.stack : String(err));
      throw new InternalServerErrorException('Could not update syllabus unit.');
    }
  }

  async remove(id: string): Promise<void> {
    const unit = await this.unitRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException(`Syllabus unit ${id} not found.`);
    await this.unitRepo.remove(unit);
  }

  async reorder(dto: ReorderSyllabusUnitsDto): Promise<SyllabusUnitEntity[]> {
    if (dto.unitIds.length === 0) return [];

    const units = await this.unitRepo.findBy(
      dto.unitIds.map((id) => ({ id })),
    );

    if (units.length !== dto.unitIds.length) {
      const foundIds = new Set(units.map((u) => u.id));
      const missing = dto.unitIds.find((id) => !foundIds.has(id));
      throw new NotFoundException(`Syllabus unit ${missing ?? 'unknown'} not found.`);
    }

    // Validate all units belong to the same subject/grade/year
    const first = units[0];
    const mismatch = units.find(
      (u) =>
        u.subjectId !== first.subjectId ||
        u.gradeId !== first.gradeId ||
        u.academicYear !== first.academicYear,
    );
    if (mismatch) {
      throw new BadRequestException(
        'All units in a reorder request must belong to the same subject, grade, and academic year.',
      );
    }

    // Use a transaction to atomically update all orders
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SyllabusUnitEntity);

      // Temporarily set orders to negative values to avoid unique constraint conflicts during the update
      for (const unit of units) {
        await repo.update(unit.id, { order: -(unit.order) - 1 });
      }

      const updated: SyllabusUnitEntity[] = [];
      for (let i = 0; i < dto.unitIds.length; i++) {
        const unit = units.find((u) => u.id === dto.unitIds[i])!;
        unit.order = i + 1;
        const saved = await repo.save(unit);
        updated.push(saved);
      }
      return updated;
    });
  }

  async copyFromYear(dto: CopyFromYearDto): Promise<SyllabusUnitEntity[]> {
    const { subjectId, gradeId, sourceYear, targetYear } = dto;

    const sourceUnits = await this.unitRepo.find({
      where: { subjectId, gradeId, academicYear: sourceYear },
      order: { order: 'ASC' },
    });

    if (sourceUnits.length === 0) {
      throw new NotFoundException(
        `No syllabus units found for this subject/grade in ${sourceYear}.`,
      );
    }

    const targetCount = await this.unitRepo.count({
      where: { subjectId, gradeId, academicYear: targetYear },
    });

    if (targetCount > 0) {
      throw new ConflictException(
        `${targetYear} already has ${targetCount} lesson(s) for this subject/grade. Clear them before copying.`,
      );
    }

    try {
      const copies = sourceUnits.map((u) =>
        this.unitRepo.create({
          subjectId: u.subjectId,
          gradeId: u.gradeId,
          title: u.title,
          description: u.description,
          order: u.order,
          academicYear: targetYear,
        }),
      );
      return await this.unitRepo.save(copies);
    } catch (err: unknown) {
      this.logger.error('SyllabusService.copyFromYear failed', err instanceof Error ? err.stack : String(err));
      throw new InternalServerErrorException('Could not copy syllabus units.');
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    );
  }
}
