import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SportEntity } from './entities/sport.entity';
import { SportMetricEntity } from './entities/sport-metric.entity';
import { CreateSportTypeDto } from './dto/create-sport-type.dto';
import { UpdateSportTypeDto } from './dto/update-sport-type.dto';
import { CreateSportMetricDto } from './dto/create-sport-metric.dto';
import { UpdateSportMetricDto } from './dto/update-sport-metric.dto';

/** Replaces the old hardcoded SportType enum — an Admin/Principal can add a new sport type
 * (e.g. Karate) at runtime, plus manage its metric list, without a code change. Metric
 * management lives here (not a separate service/controller) since a sport type and its metrics
 * are one catalog concern managed by the same admin screen — unlike Sport/Performance/Snapshot,
 * which are three genuinely distinct concerns each with real logic of their own. */
@Injectable()
export class SportTypeService {
  constructor(
    @InjectRepository(SportTypeEntity)
    private readonly sportTypeRepo: Repository<SportTypeEntity>,

    @InjectRepository(SportEntity)
    private readonly sportRepo: Repository<SportEntity>,

    @InjectRepository(SportMetricEntity)
    private readonly sportMetricRepo: Repository<SportMetricEntity>,
  ) {}

  async findAll(): Promise<SportTypeEntity[]> {
    return this.sportTypeRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<SportTypeEntity> {
    const sportType = await this.sportTypeRepo.findOne({ where: { id } });
    if (!sportType) throw new NotFoundException(`Sport type ${id} not found.`);
    return sportType;
  }

  async create(dto: CreateSportTypeDto): Promise<SportTypeEntity> {
    const sportType = this.sportTypeRepo.create({
      name: dto.name,
      isPersonalBestEligible: dto.isPersonalBestEligible ?? false,
    });
    return this.sportTypeRepo.save(sportType);
  }

  async update(id: string, dto: UpdateSportTypeDto): Promise<SportTypeEntity> {
    const sportType = await this.findById(id);
    if (dto.name !== undefined) sportType.name = dto.name;
    if (dto.isPersonalBestEligible !== undefined) {
      sportType.isPersonalBestEligible = dto.isPersonalBestEligible;
    }
    return this.sportTypeRepo.save(sportType);
  }

  /** "if Karate came to school" is the addition story — this is its inverse: a type can't be
   * removed while any real Sport still points at it (the FK is RESTRICT at the DB level too;
   * this is the friendlier 409 checked before that constraint would otherwise surface as a raw
   * DB error). */
  async delete(id: string): Promise<void> {
    await this.findById(id);
    const inUse = await this.sportRepo.count({ where: { sportTypeId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot delete this sport type — ${inUse} sport(s) currently use it.`,
      );
    }
    await this.sportMetricRepo.delete({ sportTypeId: id });
    await this.sportTypeRepo.delete(id);
  }

  async findMetrics(sportTypeId: string): Promise<SportMetricEntity[]> {
    await this.findById(sportTypeId);
    return this.sportMetricRepo.find({
      where: { sportTypeId },
      order: { ordering: 'ASC' },
    });
  }

  async createMetric(
    sportTypeId: string,
    dto: CreateSportMetricDto,
  ): Promise<SportMetricEntity> {
    await this.findById(sportTypeId);
    const metric = this.sportMetricRepo.create({
      sportTypeId,
      metricName: dto.metricName,
      unit: dto.unit ?? null,
      isTimeBased: dto.isTimeBased ?? false,
      isDistanceBased: dto.isDistanceBased ?? false,
      ordering: dto.ordering,
    });
    return this.sportMetricRepo.save(metric);
  }

  async updateMetric(
    metricId: string,
    dto: UpdateSportMetricDto,
  ): Promise<SportMetricEntity> {
    const metric = await this.sportMetricRepo.findOne({ where: { id: metricId } });
    if (!metric) throw new NotFoundException(`Sport metric ${metricId} not found.`);

    if (dto.metricName !== undefined) metric.metricName = dto.metricName;
    if (dto.unit !== undefined) metric.unit = dto.unit;
    if (dto.isTimeBased !== undefined) metric.isTimeBased = dto.isTimeBased;
    if (dto.isDistanceBased !== undefined) metric.isDistanceBased = dto.isDistanceBased;
    if (dto.ordering !== undefined) metric.ordering = dto.ordering;

    return this.sportMetricRepo.save(metric);
  }

  async deleteMetric(metricId: string): Promise<void> {
    const metric = await this.sportMetricRepo.findOne({ where: { id: metricId } });
    if (!metric) throw new NotFoundException(`Sport metric ${metricId} not found.`);
    await this.sportMetricRepo.delete(metricId);
  }
}
