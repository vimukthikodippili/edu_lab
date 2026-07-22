import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { In, IsNull, Not, Repository } from 'typeorm';
import { EquipmentEntity } from './entities/equipment.entity';
import { LabEntity } from '../labs/entities/lab.entity';
import { NotificationService } from '../notification/notification.service';

const NOTIFICATION_TYPE = 'equipment_low_stock';

/** Kept as its own small service (separate from EquipmentService) so the explicitly-requested
 * low-stock test targets a focused file — mirrors how LabBookingService is kept separate from
 * LabService by concern within the sibling `labs` module. */
@Injectable()
export class EquipmentStockAlertService {
  private readonly logger = new Logger(EquipmentStockAlertService.name);

  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepo: Repository<EquipmentEntity>,

    @InjectRepository(LabEntity)
    private readonly labRepo: Repository<LabEntity>,

    private readonly notificationService: NotificationService,
  ) {}

  // Matches CounselorCaseService.detectAndCreateCases's exact daily-morning schedule.
  @Cron('0 7 * * *')
  async checkLowStock(): Promise<void> {
    const trackedItems = await this.equipmentRepo.find({
      where: { minStockLevel: Not(IsNull()) },
    });
    if (trackedItems.length === 0) return;

    const labIds = [...new Set(trackedItems.map((e) => e.labId))];
    const labs = await this.labRepo.find({ where: { id: In(labIds) } });
    const labMap = new Map(labs.map((l) => [l.id, l]));

    let notified = 0;
    for (const item of trackedItems) {
      const lab = labMap.get(item.labId);
      if (!lab) continue;
      if (await this.evaluateItem(item, lab)) notified++;
    }
    if (notified > 0) {
      this.logger.log(`EquipmentStockAlertService: ${notified} low-stock notification(s) sent.`);
    }
  }

  /** Crossing-based idempotency — notify once when quantity first drops to/below
   * minStockLevel; don't re-notify while it stays low; clear the guard once restocked so a
   * future dip re-notifies. Also called directly by EquipmentService.writeOff for an immediate
   * check, rather than waiting for the next 07:00 run. Returns true if a notification was sent. */
  async evaluateItem(item: EquipmentEntity, lab: LabEntity): Promise<boolean> {
    if (item.minStockLevel == null) return false;
    const isLow = item.quantity <= item.minStockLevel;

    if (isLow && !item.lowStockNotifiedAt) {
      await this.notificationService.createForStaff(
        lab.labInChargeId,
        'Low Stock Alert',
        `${item.name} in ${lab.name} is low: ${item.quantity} ${item.unit} remaining (minimum ${item.minStockLevel}).`,
        NOTIFICATION_TYPE,
      );
      item.lowStockNotifiedAt = new Date();
      await this.equipmentRepo.save(item);
      return true;
    }

    if (!isLow && item.lowStockNotifiedAt) {
      item.lowStockNotifiedAt = null;
      await this.equipmentRepo.save(item);
    }

    return false;
  }
}
