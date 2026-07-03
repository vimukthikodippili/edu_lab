import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { GradingBandEntity } from '../entities/grading-band.entity';
import { CreateGradingBandDto } from '../dto/create-grading-band.dto';
import { UpdateGradingBandDto } from '../dto/update-grading-band.dto';

@Injectable()
export class GradingBandService {
  constructor(
    @InjectRepository(GradingBandEntity)
    private readonly bandRepo: Repository<GradingBandEntity>,
  ) {}

  async findAll(): Promise<GradingBandEntity[]> {
    return this.bandRepo.find({ order: { ordering: 'ASC' } });
  }

  async findBandForPercentage(
    percentage: number,
  ): Promise<GradingBandEntity | null> {
    const bands = await this.bandRepo.find();
    const match = bands.find(
      (b) =>
        percentage >= Number(b.minPercent) &&
        percentage <= Number(b.maxPercent),
    );
    return match ?? null;
  }

  async create(dto: CreateGradingBandDto): Promise<GradingBandEntity> {
    await this.assertNoOverlap(dto.minPercent, dto.maxPercent);
    const band = this.bandRepo.create({
      minPercent: String(dto.minPercent),
      maxPercent: String(dto.maxPercent),
      letter: dto.letter,
      ordering: dto.ordering,
    });
    return this.bandRepo.save(band);
  }

  async update(
    id: number,
    dto: UpdateGradingBandDto,
  ): Promise<GradingBandEntity> {
    const band = await this.bandRepo.findOne({ where: { id } });
    if (!band) throw new NotFoundException(`Grading band ${id} not found.`);

    const minPercent = dto.minPercent ?? Number(band.minPercent);
    const maxPercent = dto.maxPercent ?? Number(band.maxPercent);
    await this.assertNoOverlap(minPercent, maxPercent, id);

    band.minPercent = String(minPercent);
    band.maxPercent = String(maxPercent);
    if (dto.letter !== undefined) band.letter = dto.letter;
    if (dto.ordering !== undefined) band.ordering = dto.ordering;

    return this.bandRepo.save(band);
  }

  async remove(id: number): Promise<void> {
    const band = await this.bandRepo.findOne({ where: { id } });
    if (!band) throw new NotFoundException(`Grading band ${id} not found.`);
    await this.bandRepo.remove(band);
  }

  private async assertNoOverlap(
    minPercent: number,
    maxPercent: number,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.bandRepo.find(
      excludeId ? { where: { id: Not(excludeId) } } : {},
    );
    const overlaps = existing.some(
      (b) =>
        minPercent <= Number(b.maxPercent) &&
        maxPercent >= Number(b.minPercent),
    );
    if (overlaps) {
      throw new ConflictException(
        `Grading band range [${minPercent}, ${maxPercent}] overlaps an existing band.`,
      );
    }
  }
}
