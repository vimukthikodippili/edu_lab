import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { SessionEquipmentUsageEntity } from './entities/session-equipment-usage.entity';
import { EquipmentDamageReportEntity } from './entities/equipment-damage-report.entity';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { EquipmentEntity } from '../equipment/entities/equipment.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { RoleEnum } from '../roles/roles.enum';
import { NotificationService } from '../notification/notification.service';
import { EquipmentStockAlertService } from '../equipment/equipment-stock-alert.service';
import { SubmitSessionReportDto } from './dto/submit-session-report.dto';

export interface SessionReportResult {
  usage: SessionEquipmentUsageEntity[];
  damage: EquipmentDamageReportEntity[];
}

const DAMAGE_NOTIFICATION_TYPE = 'equipment_damage_report';

/** Post-session equipment usage + damage/missing reporting (SRS FR-P3-EQ-08 through 12). Usage
 * and damage are submitted together as one atomic action, matching the story's own "on
 * submission: (1)...(2)...(3)" framing — not two separate button-clicks. */
@Injectable()
export class SessionEquipmentService {
  constructor(
    @InjectRepository(SessionEquipmentUsageEntity)
    private readonly usageRepo: Repository<SessionEquipmentUsageEntity>,

    @InjectRepository(EquipmentDamageReportEntity)
    private readonly damageRepo: Repository<EquipmentDamageReportEntity>,

    @InjectRepository(LabBookingEntity)
    private readonly bookingRepo: Repository<LabBookingEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,

    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepo: Repository<EquipmentEntity>,

    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly stockAlertService: EquipmentStockAlertService,
  ) {}

  async findForBooking(labBookingId: string, staffId: string, isPrivileged: boolean): Promise<SessionReportResult> {
    const booking = await this.findBooking(labBookingId);
    this.assertOwnership(booking, staffId, isPrivileged);

    const [usage, damage] = await Promise.all([
      this.usageRepo.find({ where: { labBookingId }, order: { submittedAt: 'DESC' } }),
      this.damageRepo.find({ where: { labBookingId }, order: { reportedAt: 'DESC' } }),
    ]);
    return { usage, damage };
  }

  async submitSessionReport(
    labBookingId: string,
    dto: SubmitSessionReportDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<SessionReportResult> {
    const booking = await this.findBooking(labBookingId);
    this.assertOwnership(booking, staffId, isPrivileged);

    if (booking.status !== 'confirmed') {
      throw new ConflictException('Cannot log a session report for a cancelled booking.');
    }

    const usageItems = dto.usage ?? [];
    const damageItems = dto.damage ?? [];
    if (usageItems.length === 0 && damageItems.length === 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { usage: 'At least one usage or damage item is required.' },
      });
    }

    const lab = await this.labRepo.findOne({ where: { id: booking.labId } });
    if (!lab) throw new NotFoundException(`Lab ${booking.labId} not found.`);

    const equipmentIds = [
      ...new Set([...usageItems.map((u) => u.equipmentId), ...damageItems.map((d) => d.equipmentId)]),
    ];
    const equipmentList = await this.equipmentRepo.find({ where: { id: In(equipmentIds) } });
    const equipmentMap = new Map(equipmentList.map((e) => [e.id, e]));

    for (const equipmentId of equipmentIds) {
      const equipment = equipmentMap.get(equipmentId);
      if (!equipment) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { equipmentId: `Equipment ${equipmentId} not found.` },
        });
      }
      if (equipment.labId !== booking.labId) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { equipmentId: `Equipment "${equipment.name}" does not belong to this session's lab.` },
        });
      }
    }

    // Combined delta per item across BOTH usage and damage, validated up front, so a submission
    // touching the same item twice in one request can't push stock negative. Only consumable
    // items (minStockLevel set — the same convention the low-stock cron uses) have usage
    // deducted; durable/reusable equipment is logged but not "consumed." Damage/missing always
    // reduces stock, consumable or not — a broken item is genuinely gone either way.
    const deltaByEquipmentId = new Map<string, number>();
    for (const u of usageItems) {
      const equipment = equipmentMap.get(u.equipmentId)!;
      if (equipment.minStockLevel != null) {
        deltaByEquipmentId.set(u.equipmentId, (deltaByEquipmentId.get(u.equipmentId) ?? 0) + u.quantityUsed);
      }
    }
    for (const d of damageItems) {
      deltaByEquipmentId.set(d.equipmentId, (deltaByEquipmentId.get(d.equipmentId) ?? 0) + d.quantity);
    }

    for (const [equipmentId, delta] of deltaByEquipmentId) {
      const equipment = equipmentMap.get(equipmentId)!;
      if (delta > equipment.quantity) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: {
            quantity: `Combined usage/damage quantity for "${equipment.name}" exceeds current stock (${equipment.quantity}).`,
          },
        });
      }
    }

    const { savedUsage, savedDamage, updatedEquipment } = await this.dataSource.transaction(async (manager) => {
      const savedUsage: SessionEquipmentUsageEntity[] = [];
      for (const u of usageItems) {
        savedUsage.push(
          await manager.save(
            SessionEquipmentUsageEntity,
            manager.create(SessionEquipmentUsageEntity, {
              labBookingId,
              equipmentId: u.equipmentId,
              quantityUsed: u.quantityUsed,
              submittedById: staffId,
            }),
          ),
        );
      }

      const savedDamage: EquipmentDamageReportEntity[] = [];
      for (const d of damageItems) {
        savedDamage.push(
          await manager.save(
            EquipmentDamageReportEntity,
            manager.create(EquipmentDamageReportEntity, {
              labBookingId,
              equipmentId: d.equipmentId,
              reportType: d.reportType,
              quantity: d.quantity,
              responsibleStudentId: d.responsibleStudentId ?? null,
              notes: d.notes ?? null,
              reportedById: staffId,
            }),
          ),
        );
      }

      const updatedEquipment: EquipmentEntity[] = [];
      for (const [equipmentId, delta] of deltaByEquipmentId) {
        const equipment = equipmentMap.get(equipmentId)!;
        equipment.quantity -= delta;
        updatedEquipment.push(await manager.save(EquipmentEntity, equipment));
      }

      return { savedUsage, savedDamage, updatedEquipment };
    });

    // Side effects run after commit, outside the transaction — a notification failure must
    // never roll back an already-persisted session report.
    for (const damage of savedDamage) {
      const equipment = equipmentMap.get(damage.equipmentId)!;
      await this.notifyDamage(lab, equipment, damage);
    }

    // Immediate low-stock re-check for anything that just dropped, rather than waiting up to
    // 24h for the next 07:00 cron — same enhancement already applied to EquipmentService.writeOff.
    for (const equipment of updatedEquipment) {
      await this.stockAlertService.evaluateItem(equipment, lab);
    }

    return { usage: savedUsage, damage: savedDamage };
  }

  private async findBooking(labBookingId: string): Promise<LabBookingEntity> {
    const booking = await this.bookingRepo.findOne({ where: { id: labBookingId } });
    if (!booking) throw new NotFoundException(`Lab booking ${labBookingId} not found.`);
    return booking;
  }

  /** "Own sessions" per FR-P3-AV-04 — the booking's own teacher, not the lab's Lab In-Charge
   * (a deliberately different ownership axis than the rest of the equipment module). */
  private assertOwnership(booking: LabBookingEntity, staffId: string, isPrivileged: boolean): void {
    if (!isPrivileged && booking.teacherId !== staffId) {
      throw new ForbiddenException('You are not the teacher for this lab session.');
    }
  }

  private async notifyDamage(
    lab: LabEntity,
    equipment: EquipmentEntity,
    damage: EquipmentDamageReportEntity,
  ): Promise<void> {
    const title = damage.reportType === 'damaged' ? 'Equipment Damaged' : 'Equipment Missing';
    const message = `${equipment.name} in ${lab.name} was reported ${damage.reportType} (quantity: ${damage.quantity}).`;

    await this.notificationService
      .createForStaff(lab.labInChargeId, title, message, DAMAGE_NOTIFICATION_TYPE)
      .catch(() => undefined);

    const principalUsers = await this.userRepo.find({
      where: { role: { id: RoleEnum.principal } },
      relations: ['role'],
    });
    for (const user of principalUsers) {
      if (!user.email) continue;
      const staff = await this.staffRepo.findOne({ where: { email: user.email } });
      if (!staff) continue;
      await this.notificationService
        .createForStaff(staff.id, title, message, DAMAGE_NOTIFICATION_TYPE)
        .catch(() => undefined);
    }
  }
}
