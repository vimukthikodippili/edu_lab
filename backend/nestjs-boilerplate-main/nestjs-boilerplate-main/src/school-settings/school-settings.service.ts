import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolSettingsEntity } from './entities/school-settings.entity';
import { UpdateSchoolSettingsDto } from './dto/update-school-settings.dto';

@Injectable()
export class SchoolSettingsService {
  constructor(
    @InjectRepository(SchoolSettingsEntity)
    private readonly repo: Repository<SchoolSettingsEntity>,
  ) {}

  /** Singleton row, lazily created with defaults on first read — no seed/migration data needed. */
  async get(): Promise<SchoolSettingsEntity> {
    const existing = await this.repo.find({ order: { id: 'ASC' }, take: 1 });
    if (existing[0]) return existing[0];
    return this.repo.save(this.repo.create());
  }

  async update(dto: UpdateSchoolSettingsDto): Promise<SchoolSettingsEntity> {
    const current = await this.get();
    current.lateThresholdMinutes = dto.lateThresholdMinutes;
    if (dto.isPublicSportsBoardEnabled !== undefined) {
      current.isPublicSportsBoardEnabled = dto.isPublicSportsBoardEnabled;
    }
    return this.repo.save(current);
  }

  /** Read-only convenience so other modules (Sports) don't need to depend on the whole
   * SchoolSettingsEntity shape — just the one boolean they actually check. */
  async isPublicSportsBoardEnabled(): Promise<boolean> {
    const settings = await this.get();
    return settings.isPublicSportsBoardEnabled;
  }
}
