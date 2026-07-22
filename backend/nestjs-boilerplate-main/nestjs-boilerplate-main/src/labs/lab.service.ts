import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { AllConfigType } from '../config/config.type';
import { LabEntity } from './entities/lab.entity';
import { LabTypeEntity } from './entities/lab-type.entity';
import { LabBookingEntity } from './entities/lab-booking.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { CreateLabDto } from './dto/create-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { computeLabAvailabilityStatus, computePeriodWindow, LabAvailabilityStatus } from './lab-availability';

export interface LabDirectoryRow extends LabEntity {
  availabilityStatus: LabAvailabilityStatus;
}

@Injectable()
export class LabService {
  constructor(
    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,

    @InjectRepository(LabTypeEntity)
    private readonly labTypeRepo: Repository<LabTypeEntity>,

    @InjectRepository(LabBookingEntity)
    private readonly bookingRepo: Repository<LabBookingEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async findAll(): Promise<LabEntity[]> {
    return this.labRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<LabEntity> {
    const lab = await this.labRepo.findOne({ where: { id } });
    if (!lab) throw new NotFoundException(`Lab ${id} not found.`);
    return lab;
  }

  async create(dto: CreateLabDto): Promise<LabEntity> {
    await this.assertLabTypeExists(dto.labTypeId);
    await this.assertLabInChargeExists(dto.labInChargeId);

    const lab = this.labRepo.create({
      name: dto.name,
      labTypeId: dto.labTypeId,
      capacity: dto.capacity,
      roomNumber: dto.roomNumber,
      labInChargeId: dto.labInChargeId,
    });
    return this.labRepo.save(lab);
  }

  async update(id: string, dto: UpdateLabDto): Promise<LabEntity> {
    const lab = await this.findById(id);

    if (dto.labTypeId !== undefined) {
      await this.assertLabTypeExists(dto.labTypeId);
      lab.labTypeId = dto.labTypeId;
    }
    if (dto.labInChargeId !== undefined) {
      await this.assertLabInChargeExists(dto.labInChargeId);
      lab.labInChargeId = dto.labInChargeId;
    }
    if (dto.name !== undefined) lab.name = dto.name;
    if (dto.capacity !== undefined) lab.capacity = dto.capacity;
    if (dto.roomNumber !== undefined) lab.roomNumber = dto.roomNumber;

    return this.labRepo.save(lab);
  }

  // Bookings CASCADE on labId — no separate "in use" check needed, unlike LabType/delete.
  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.labRepo.delete(id);
  }

  /** Lab In-Charge is a staff *assignment* on the row, not a portal login role — a privileged
   * caller (admin/principal) may toggle any lab; anyone else must be the assigned Lab In-Charge
   * for this specific lab. Byte-for-byte copy of SportsService.assertAuthorized's coach-ownership
   * rule. */
  async toggleMaintenance(
    labId: string,
    staffId: string,
    isPrivileged: boolean,
    isUnderMaintenance: boolean,
  ): Promise<LabEntity> {
    const lab = await this.findById(labId);
    if (!isPrivileged && lab.labInChargeId !== staffId) {
      throw new ForbiddenException('You are not the Lab In-Charge for this lab.');
    }
    lab.isUnderMaintenance = isUnderMaintenance;
    return this.labRepo.save(lab);
  }

  /** Mirrors LiveClassMonitorService.getTodayStatusGrid() — a single canonical `now`, one
   * batched query against today's bookings, a pure per-row status function. Computed
   * server-side so the badge reflects the server's clock, not each browser's. */
  async getDirectory(): Promise<LabDirectoryRow[]> {
    const labs = await this.findAll();
    if (labs.length === 0) return [];

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const todaysBookings = await this.bookingRepo.find({
      where: { labId: In(labs.map((l) => l.id)), date: today },
    });

    const schoolStartTime = this.configService.get('freePeriod.schoolStartTime', {
      infer: true,
    }) as string;
    const periodDurationMinutes = this.configService.get(
      'freePeriod.periodDurationMinutes',
      { infer: true },
    ) as number;

    const activeLabIds = new Set(
      todaysBookings
        .filter((b) => {
          const { start, end } = computePeriodWindow(now, b.periodNumber, schoolStartTime, periodDurationMinutes);
          return now >= start && now < end;
        })
        .map((b) => b.labId),
    );

    return labs.map((lab) => ({
      ...lab,
      availabilityStatus: computeLabAvailabilityStatus(lab.isUnderMaintenance, activeLabIds.has(lab.id)),
    }));
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

  private async assertLabInChargeExists(labInChargeId: string): Promise<void> {
    const exists = await this.staffRepo.findOne({ where: { id: labInChargeId } });
    if (!exists) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { labInChargeId: `Staff member ${labInChargeId} not found.` },
      });
    }
  }
}
