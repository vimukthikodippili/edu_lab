import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentCategoryEntity } from './entities/equipment-category.entity';
import { EquipmentEntity } from './entities/equipment.entity';
import { LabTypeEntity } from '../labs/entities/lab-type.entity';
import { CreateEquipmentCategoryDto } from './dto/create-equipment-category.dto';
import { UpdateEquipmentCategoryDto } from './dto/update-equipment-category.dto';

/** A school-configurable catalog of equipment categories, scoped per lab type (e.g. Science:
 * Glassware/Instruments/Chemicals/Safety) — a school-wide catalog decision, mirroring
 * LabTypeService's exact shape. */
@Injectable()
export class EquipmentCategoryService {
  constructor(
    @InjectRepository(EquipmentCategoryEntity)
    private readonly categoryRepo: Repository<EquipmentCategoryEntity>,

    @InjectRepository(LabTypeEntity)
    private readonly labTypeRepo: Repository<LabTypeEntity>,

    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepo: Repository<EquipmentEntity>,
  ) {}

  async findAll(labTypeId?: string): Promise<EquipmentCategoryEntity[]> {
    return this.categoryRepo.find({
      where: labTypeId ? { labTypeId } : {},
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<EquipmentCategoryEntity> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Equipment category ${id} not found.`);
    return category;
  }

  async create(dto: CreateEquipmentCategoryDto): Promise<EquipmentCategoryEntity> {
    await this.assertLabTypeExists(dto.labTypeId);
    const category = this.categoryRepo.create({ labTypeId: dto.labTypeId, name: dto.name });
    return this.categoryRepo.save(category);
  }

  async update(id: string, dto: UpdateEquipmentCategoryDto): Promise<EquipmentCategoryEntity> {
    const category = await this.findById(id);
    if (dto.labTypeId !== undefined) {
      await this.assertLabTypeExists(dto.labTypeId);
      category.labTypeId = dto.labTypeId;
    }
    if (dto.name !== undefined) category.name = dto.name;
    return this.categoryRepo.save(category);
  }

  /** A category can't be removed while any equipment item still references it (the FK is
   * RESTRICT at the DB level too — this is the friendlier 409 checked first). */
  async delete(id: string): Promise<void> {
    await this.findById(id);
    const inUse = await this.equipmentRepo.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot delete this equipment category — ${inUse} item(s) currently use it.`,
      );
    }
    await this.categoryRepo.delete(id);
  }

  private async assertLabTypeExists(labTypeId: string): Promise<void> {
    const exists = await this.labTypeRepo.findOne({ where: { id: labTypeId } });
    if (!exists) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { labTypeId: `Lab type ${labTypeId} not found.` },
      });
    }
  }
}
