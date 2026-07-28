import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionRuleEntity } from './entities/action-rule.entity';
import { CreateActionRuleDto } from './dto/create-action-rule.dto';
import { UpdateActionRuleDto } from './dto/update-action-rule.dto';

/** MHA-131 — FR-MHA-37. Admin CRUD for the recommended-action rule set. Mirrors
 * DisorderRegistryService: deliberately soft-deactivate-only via `isActive`, no delete(). */
@Injectable()
export class ActionRuleService {
  constructor(
    @InjectRepository(ActionRuleEntity)
    private readonly repo: Repository<ActionRuleEntity>,
  ) {}

  async findAll(activeOnly = false): Promise<ActionRuleEntity[]> {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { priority: 'ASC' },
    });
  }

  async findById(id: string): Promise<ActionRuleEntity> {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException(`Action rule ${id} not found.`);
    return rule;
  }

  /** Consumed internally by RecommendedActionService.generate() — active rules, priority-ordered. */
  async findActive(): Promise<ActionRuleEntity[]> {
    return this.findAll(true);
  }

  async create(dto: CreateActionRuleDto): Promise<ActionRuleEntity> {
    const rule = this.repo.create({
      riskCategory: dto.riskCategory ?? null,
      minimumLevel: dto.minimumLevel,
      actionText: dto.actionText,
      isActive: dto.isActive ?? true,
      priority: dto.priority,
    });
    return this.repo.save(rule);
  }

  async update(id: string, dto: UpdateActionRuleDto): Promise<ActionRuleEntity> {
    const rule = await this.findById(id);

    if (dto.riskCategory !== undefined) rule.riskCategory = dto.riskCategory;
    if (dto.minimumLevel !== undefined) rule.minimumLevel = dto.minimumLevel;
    if (dto.actionText !== undefined) rule.actionText = dto.actionText;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;
    if (dto.priority !== undefined) rule.priority = dto.priority;

    return this.repo.save(rule);
  }
}
