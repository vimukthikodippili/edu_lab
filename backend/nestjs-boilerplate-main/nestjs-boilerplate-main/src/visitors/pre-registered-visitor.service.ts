import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { PreRegisteredVisitorEntity } from './entities/pre-registered-visitor.entity';
import { CreatePreRegisteredVisitorDto } from './dto/create-pre-registered-visitor.dto';

@Injectable()
export class PreRegisteredVisitorService {
  constructor(
    @InjectRepository(PreRegisteredVisitorEntity)
    private readonly preRegRepo: Repository<PreRegisteredVisitorEntity>,
  ) {}

  async create(dto: CreatePreRegisteredVisitorDto, actorStaffId: string): Promise<PreRegisteredVisitorEntity> {
    return this.preRegRepo.save(
      this.preRegRepo.create({
        fullName: dto.fullName,
        idNumber: dto.idNumber ?? null,
        idType: dto.idType ?? null,
        visitorType: dto.visitorType,
        purpose: dto.purpose,
        expectedDate: dto.expectedDate,
        hostStaffId: dto.hostStaffId,
        createdByStaffId: actorStaffId,
      }),
    );
  }

  /** Reception's pre-fill lookup — only unconsumed records for today are relevant. */
  async findForToday(): Promise<PreRegisteredVisitorEntity[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.preRegRepo.find({
      where: { expectedDate: today, consumedVisitorLogId: IsNull() },
      order: { fullName: 'ASC' },
    });
  }

  async search(name: string): Promise<PreRegisteredVisitorEntity[]> {
    return this.preRegRepo.find({
      where: { fullName: ILike(`%${name}%`), consumedVisitorLogId: IsNull() },
      order: { expectedDate: 'ASC' },
    });
  }
}
