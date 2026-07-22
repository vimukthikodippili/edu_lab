import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EquipmentEntity, EquipmentCondition } from './entities/equipment.entity';
import { EquipmentCategoryEntity } from './entities/equipment-category.entity';
import { EquipmentConditionHistoryEntity } from './entities/equipment-condition-history.entity';
import { EquipmentWriteOffEntity } from './entities/equipment-write-off.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { WriteOffEquipmentDto } from './dto/write-off-equipment.dto';
import { EquipmentStockAlertService } from './equipment-stock-alert.service';

export interface EquipmentRow extends EquipmentEntity {
  lowStock: boolean;
}

function withLowStock(item: EquipmentEntity): EquipmentRow {
  return {
    ...item,
    lowStock: item.minStockLevel != null && item.quantity <= item.minStockLevel,
  };
}

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepo: Repository<EquipmentEntity>,

    @InjectRepository(EquipmentCategoryEntity)
    private readonly categoryRepo: Repository<EquipmentCategoryEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,

    @InjectRepository(EquipmentConditionHistoryEntity)
    private readonly historyRepo: Repository<EquipmentConditionHistoryEntity>,

    @InjectRepository(EquipmentWriteOffEntity)
    private readonly writeOffRepo: Repository<EquipmentWriteOffEntity>,

    private readonly dataSource: DataSource,

    private readonly stockAlertService: EquipmentStockAlertService,
  ) {}

  async findByLab(labId: string): Promise<EquipmentRow[]> {
    await this.findLab(labId);
    const items = await this.equipmentRepo.find({ where: { labId }, order: { name: 'ASC' } });
    return items.map(withLowStock);
  }

  async findById(id: string): Promise<EquipmentEntity> {
    const item = await this.equipmentRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Equipment ${id} not found.`);
    return item;
  }

  async findConditionHistory(id: string): Promise<EquipmentConditionHistoryEntity[]> {
    await this.findById(id);
    return this.historyRepo.find({
      where: { equipmentId: id },
      order: { changedAt: 'DESC' },
    });
  }

  async create(
    labId: string,
    dto: CreateEquipmentDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<EquipmentEntity> {
    const lab = await this.findLab(labId);
    this.assertOwnership(lab, staffId, isPrivileged);
    await this.assertCategoryMatchesLabType(dto.categoryId, lab.labTypeId);

    const item = this.equipmentRepo.create({
      labId,
      name: dto.name,
      categoryId: dto.categoryId,
      quantity: dto.quantity,
      unit: dto.unit,
      condition: dto.condition ?? 'good',
      serialNumber: dto.serialNumber ?? null,
      purchaseDate: dto.purchaseDate,
      minStockLevel: dto.minStockLevel ?? null,
    });
    return this.equipmentRepo.save(item);
  }

  async update(
    id: string,
    dto: UpdateEquipmentDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<EquipmentEntity> {
    const item = await this.findById(id);
    const lab = await this.findLab(item.labId);
    this.assertOwnership(lab, staffId, isPrivileged);

    if (dto.categoryId !== undefined) {
      await this.assertCategoryMatchesLabType(dto.categoryId, lab.labTypeId);
      item.categoryId = dto.categoryId;
    }
    if (dto.name !== undefined) item.name = dto.name;
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.serialNumber !== undefined) item.serialNumber = dto.serialNumber;
    if (dto.purchaseDate !== undefined) item.purchaseDate = dto.purchaseDate;
    if (dto.minStockLevel !== undefined) item.minStockLevel = dto.minStockLevel;

    return this.equipmentRepo.save(item);
  }

  /** Condition changes only happen here — never through update() — so "condition history is
   * retained" can never be bypassed. A true no-op (no history row) when unchanged. */
  async updateCondition(
    id: string,
    newCondition: EquipmentCondition,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<EquipmentEntity> {
    const item = await this.findById(id);
    const lab = await this.findLab(item.labId);
    this.assertOwnership(lab, staffId, isPrivileged);

    if (newCondition === item.condition) return item;

    const previousCondition = item.condition;
    item.condition = newCondition;

    return this.dataSource.transaction(async (manager) => {
      await manager.save(
        EquipmentConditionHistoryEntity,
        manager.create(EquipmentConditionHistoryEntity, {
          equipmentId: item.id,
          previousCondition,
          newCondition,
          changedById: staffId,
        }),
      );
      return manager.save(EquipmentEntity, item);
    });
  }

  async writeOff(
    id: string,
    dto: WriteOffEquipmentDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<EquipmentEntity> {
    const item = await this.findById(id);
    const lab = await this.findLab(item.labId);
    this.assertOwnership(lab, staffId, isPrivileged);

    if (dto.quantity > item.quantity) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { quantity: 'Write-off quantity exceeds current stock.' },
      });
    }

    item.quantity -= dto.quantity;

    const updated = await this.dataSource.transaction(async (manager) => {
      await manager.save(
        EquipmentWriteOffEntity,
        manager.create(EquipmentWriteOffEntity, {
          equipmentId: item.id,
          quantity: dto.quantity,
          reason: dto.reason,
          writtenOffById: staffId,
        }),
      );
      return manager.save(EquipmentEntity, item);
    });

    // Immediate check rather than waiting up to 24h for the next daily cron run — a write-off
    // that crosses the threshold should notify right away.
    await this.stockAlertService.evaluateItem(updated, lab);

    return updated;
  }

  private async findLab(labId: string): Promise<LabEntity> {
    const lab = await this.labRepo.findOne({ where: { id: labId } });
    if (!lab) throw new NotFoundException(`Lab ${labId} not found.`);
    return lab;
  }

  /** Lab In-Charge is a staff *assignment* on the lab row, not a portal role — byte-for-byte
   * copy of LabService.toggleMaintenance's ownership rule. */
  private assertOwnership(lab: LabEntity, staffId: string, isPrivileged: boolean): void {
    if (!isPrivileged && lab.labInChargeId !== staffId) {
      throw new ForbiddenException('You are not the Lab In-Charge for this lab.');
    }
  }

  private async assertCategoryMatchesLabType(categoryId: string, labTypeId: string): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { categoryId: `Equipment category ${categoryId} not found.` },
      });
    }
    if (category.labTypeId !== labTypeId) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { categoryId: `Category "${category.name}" does not belong to this lab's type.` },
      });
    }
  }
}
