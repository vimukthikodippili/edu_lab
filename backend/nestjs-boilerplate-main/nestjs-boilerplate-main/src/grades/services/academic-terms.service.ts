import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicTermEntity } from '../entities/academic-term.entity';
import { CreateAcademicTermDto } from '../dto/create-academic-term.dto';

@Injectable()
export class AcademicTermsService {
  constructor(
    @InjectRepository(AcademicTermEntity)
    private readonly termRepo: Repository<AcademicTermEntity>,
  ) {}

  async create(dto: CreateAcademicTermDto): Promise<AcademicTermEntity> {
    const existing = await this.termRepo.findOne({
      where: { termNumber: dto.termNumber, academicYear: dto.academicYear },
    });
    if (existing) {
      throw new ConflictException(
        `Term ${dto.termNumber} for academic year ${dto.academicYear} already exists.`,
      );
    }
    const term = this.termRepo.create({
      name: dto.name,
      termNumber: dto.termNumber,
      academicYear: dto.academicYear,
      startDate: new Date(dto.startDate + 'T00:00:00Z') as unknown as Date,
      endDate: new Date(dto.endDate + 'T00:00:00Z') as unknown as Date,
    });
    return this.termRepo.save(term);
  }

  async findAll(): Promise<AcademicTermEntity[]> {
    return this.termRepo.find({
      order: { academicYear: 'DESC', termNumber: 'ASC' },
    });
  }

  async findById(id: number): Promise<AcademicTermEntity> {
    const term = await this.termRepo.findOne({ where: { id } });
    if (!term) throw new NotFoundException(`Academic term #${id} not found.`);
    return term;
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.termRepo.delete(id);
  }
}
