import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentCategoryEntity } from '../../../../equipment/entities/equipment-category.entity';
import { LabTypeEntity } from '../../../../labs/entities/lab-type.entity';

interface SeedCategory {
  labTypeName: string;
  name: string;
}

// Defaults per Lab Management SRS §4.1 (FR-P3-EQ-02). "Other" gets no defaults, consistent with
// its no-special-treatment elsewhere in the labs module — a school adds custom categories as needed.
const CATEGORIES: SeedCategory[] = [
  { labTypeName: 'Science', name: 'Glassware' },
  { labTypeName: 'Science', name: 'Instruments' },
  { labTypeName: 'Science', name: 'Chemicals' },
  { labTypeName: 'Science', name: 'Safety' },
  { labTypeName: 'Computer', name: 'Hardware' },
  { labTypeName: 'Computer', name: 'Peripherals' },
  { labTypeName: 'Art', name: 'Paints' },
  { labTypeName: 'Art', name: 'Canvas' },
  { labTypeName: 'Art', name: 'Tools' },
  { labTypeName: 'Language', name: 'Headsets' },
  { labTypeName: 'Language', name: 'Audio Stations' },
];

@Injectable()
export class EquipmentCategorySeedService {
  constructor(
    @InjectRepository(EquipmentCategoryEntity)
    private readonly categoryRepository: Repository<EquipmentCategoryEntity>,

    @InjectRepository(LabTypeEntity)
    private readonly labTypeRepository: Repository<LabTypeEntity>,
  ) {}

  // Depends on LabTypeSeedService having already run — run-seed.ts orders this explicitly.
  async run(): Promise<void> {
    for (const category of CATEGORIES) {
      const labType = await this.labTypeRepository.findOne({
        where: { name: category.labTypeName },
      });
      if (!labType) continue; // lab type seed hasn't run, or was renamed/removed since

      const exists = await this.categoryRepository.findOne({
        where: { labTypeId: labType.id, name: category.name },
      });
      if (!exists) {
        await this.categoryRepository.save(
          this.categoryRepository.create({ labTypeId: labType.id, name: category.name }),
        );
      }
    }
  }
}
