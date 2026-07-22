import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabTypeEntity } from '../../../../labs/entities/lab-type.entity';

// The 5 defaults from the Phase 3 SRS Section 1.2 table — no longer fixed forever: an
// Admin/Principal can add custom types beyond these via LabTypeController.
const LAB_TYPES = ['Science', 'Computer', 'Language', 'Art', 'Other'];

@Injectable()
export class LabTypeSeedService {
  constructor(
    @InjectRepository(LabTypeEntity)
    private readonly labTypeRepository: Repository<LabTypeEntity>,
  ) {}

  async run(): Promise<void> {
    for (const name of LAB_TYPES) {
      const exists = await this.labTypeRepository.findOne({ where: { name } });
      if (!exists) {
        await this.labTypeRepository.save(this.labTypeRepository.create({ name }));
      }
    }
  }
}
