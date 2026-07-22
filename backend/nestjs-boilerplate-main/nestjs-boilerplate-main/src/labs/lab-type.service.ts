import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabTypeEntity } from './entities/lab-type.entity';
import { LabEntity } from './entities/lab.entity';
import { CreateLabTypeDto } from './dto/create-lab-type.dto';
import { UpdateLabTypeDto } from './dto/update-lab-type.dto';

/** A school-configurable catalog of lab types — an Admin/Principal can add a custom type (e.g.
 * "Robotics") beyond the 5 seeded defaults, without a code change. Mirrors SportTypeService. */
@Injectable()
export class LabTypeService {
  constructor(
    @InjectRepository(LabTypeEntity)
    private readonly labTypeRepo: Repository<LabTypeEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,
  ) {}

  async findAll(): Promise<LabTypeEntity[]> {
    return this.labTypeRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<LabTypeEntity> {
    const labType = await this.labTypeRepo.findOne({ where: { id } });
    if (!labType) throw new NotFoundException(`Lab type ${id} not found.`);
    return labType;
  }

  async create(dto: CreateLabTypeDto): Promise<LabTypeEntity> {
    const labType = this.labTypeRepo.create({ name: dto.name });
    return this.labTypeRepo.save(labType);
  }

  async update(id: string, dto: UpdateLabTypeDto): Promise<LabTypeEntity> {
    const labType = await this.findById(id);
    if (dto.name !== undefined) labType.name = dto.name;
    return this.labTypeRepo.save(labType);
  }

  /** A type can't be removed while any real Lab still points at it (the FK is RESTRICT at the
   * DB level too; this is the friendlier 409 checked before that constraint would otherwise
   * surface as a raw DB error). */
  async delete(id: string): Promise<void> {
    await this.findById(id);
    const inUse = await this.labRepo.count({ where: { labTypeId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `Cannot delete this lab type — ${inUse} lab(s) currently use it.`,
      );
    }
    await this.labTypeRepo.delete(id);
  }
}
