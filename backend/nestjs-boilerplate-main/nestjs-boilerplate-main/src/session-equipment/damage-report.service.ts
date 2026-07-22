import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { EquipmentDamageReportEntity } from './entities/equipment-damage-report.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { GetDamageReportsDto } from './dto/get-damage-reports.dto';

export interface DamageReportRow extends EquipmentDamageReportEntity {
  labId: string | null;
  labName: string;
  sessionDate: string | null;
}

/** The Lab In-Charge / Principal filterable damage-report view (FR-P3-EQ-12). Scoping mirrors
 * EquipmentInventoryReportService exactly: a given labId requires ownership (unless privileged);
 * omitted, privileged callers see everything and non-privileged callers see only labs they're
 * in charge of. */
@Injectable()
export class DamageReportService {
  constructor(
    @InjectRepository(EquipmentDamageReportEntity)
    private readonly reportRepo: Repository<EquipmentDamageReportEntity>,

    @InjectRepository(LabBookingEntity)
    private readonly bookingRepo: Repository<LabBookingEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,
  ) {}

  async findReports(
    dto: GetDamageReportsDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<DamageReportRow[]> {
    let labIds: string[] | null = null;

    if (dto.labId) {
      const lab = await this.labRepo.findOne({ where: { id: dto.labId } });
      if (!lab) throw new NotFoundException(`Lab ${dto.labId} not found.`);
      if (!isPrivileged && lab.labInChargeId !== staffId) {
        throw new ForbiddenException('You are not the Lab In-Charge for this lab.');
      }
      labIds = [dto.labId];
    } else if (!isPrivileged) {
      const myLabs = await this.labRepo.find({ where: { labInChargeId: staffId } });
      labIds = myLabs.map((l) => l.id);
      if (labIds.length === 0) return [];
    }

    let bookingIds: string[] | undefined;
    if (labIds) {
      const bookings = await this.bookingRepo.find({ where: { labId: In(labIds) } });
      bookingIds = bookings.map((b) => b.id);
      if (bookingIds.length === 0) return [];
    }

    const where: FindOptionsWhere<EquipmentDamageReportEntity> = {};
    if (bookingIds) where.labBookingId = In(bookingIds);
    if (dto.reportType) where.reportType = dto.reportType;

    if (dto.dateFrom && dto.dateTo) {
      where.reportedAt = Between(
        new Date(`${dto.dateFrom}T00:00:00Z`),
        new Date(`${dto.dateTo}T23:59:59Z`),
      );
    } else if (dto.dateFrom) {
      where.reportedAt = MoreThanOrEqual(new Date(`${dto.dateFrom}T00:00:00Z`));
    } else if (dto.dateTo) {
      where.reportedAt = LessThanOrEqual(new Date(`${dto.dateTo}T23:59:59Z`));
    }

    const reports = await this.reportRepo.find({ where, order: { reportedAt: 'DESC' } });
    if (reports.length === 0) return [];

    const uniqueBookingIds = [...new Set(reports.map((r) => r.labBookingId))];
    const bookings = await this.bookingRepo.find({ where: { id: In(uniqueBookingIds) } });
    const bookingMap = new Map(bookings.map((b) => [b.id, b]));

    const uniqueLabIds = [...new Set(bookings.map((b) => b.labId))];
    const labs = uniqueLabIds.length > 0 ? await this.labRepo.find({ where: { id: In(uniqueLabIds) } }) : [];
    const labMap = new Map(labs.map((l) => [l.id, l]));

    return reports.map((report) => {
      const booking = bookingMap.get(report.labBookingId);
      const lab = booking ? labMap.get(booking.labId) : undefined;
      return {
        ...report,
        labId: booking?.labId ?? null,
        labName: lab?.name ?? 'Unknown',
        sessionDate: booking?.date ?? null,
      };
    });
  }
}
