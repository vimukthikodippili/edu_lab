import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisorderRegistryEntity } from './entities/disorder-registry.entity';
import { CreateDisorderRegistryDto } from './dto/create-disorder-registry.dto';
import { UpdateDisorderRegistryDto } from './dto/update-disorder-registry.dto';

/** Module 12 (MHA) Disorder/Test Registry — configuration data only, no clinical scoring. Unlike
 * every other seeded lookup table in this codebase, deactivation is the only removal path: a
 * domain referenced by a historical MHA session must never be hard-deleted (AC #2), so there is
 * deliberately no delete() method here. */
@Injectable()
export class DisorderRegistryService {
  constructor(
    @InjectRepository(DisorderRegistryEntity)
    private readonly repo: Repository<DisorderRegistryEntity>,
  ) {}

  async findAll(activeOnly = false): Promise<DisorderRegistryEntity[]> {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { section: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<DisorderRegistryEntity> {
    const domain = await this.repo.findOne({ where: { id } });
    if (!domain) throw new NotFoundException(`Disorder registry entry ${id} not found.`);
    return domain;
  }

  async create(dto: CreateDisorderRegistryDto): Promise<DisorderRegistryEntity> {
    this.assertAgeRange(dto.ageMin, dto.ageMax);
    const existing = await this.repo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`A disorder registry entry with code "${dto.code}" already exists.`);
    }
    const domain = this.repo.create({
      code: dto.code,
      name: dto.name,
      section: dto.section,
      riskCategory: dto.riskCategory,
      ageMin: dto.ageMin,
      ageMax: dto.ageMax,
      symptoms: dto.symptoms ?? [],
      tests: dto.tests ?? [],
      safetyFlag: dto.safetyFlag ?? false,
    });
    return this.repo.save(domain);
  }

  async update(id: string, dto: UpdateDisorderRegistryDto): Promise<DisorderRegistryEntity> {
    const domain = await this.findById(id);

    if (dto.code !== undefined && dto.code !== domain.code) {
      const existing = await this.repo.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`A disorder registry entry with code "${dto.code}" already exists.`);
      }
      domain.code = dto.code;
    }
    if (dto.name !== undefined) domain.name = dto.name;
    if (dto.section !== undefined) domain.section = dto.section;
    if (dto.riskCategory !== undefined) domain.riskCategory = dto.riskCategory;
    if (dto.ageMin !== undefined) domain.ageMin = dto.ageMin;
    if (dto.ageMax !== undefined) domain.ageMax = dto.ageMax;
    if (dto.symptoms !== undefined) domain.symptoms = dto.symptoms;
    if (dto.tests !== undefined) domain.tests = dto.tests;
    if (dto.safetyFlag !== undefined) domain.safetyFlag = dto.safetyFlag;
    if (dto.isActive !== undefined) domain.isActive = dto.isActive;

    this.assertAgeRange(domain.ageMin, domain.ageMax);
    return this.repo.save(domain);
  }

  private assertAgeRange(ageMin: number, ageMax: number): void {
    if (ageMax < ageMin) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { ageMax: 'ageMax must be greater than or equal to ageMin.' },
      });
    }
  }
}
