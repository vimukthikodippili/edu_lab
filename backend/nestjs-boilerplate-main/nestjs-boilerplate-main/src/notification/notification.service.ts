import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InAppNotificationEntity } from './entities/in-app-notification.entity';
import { GuardianNotificationEntity } from './entities/guardian-notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(InAppNotificationEntity)
    private readonly repo: Repository<InAppNotificationEntity>,

    @InjectRepository(GuardianNotificationEntity)
    private readonly guardianRepo: Repository<GuardianNotificationEntity>,
  ) {}

  async createForStaff(
    staffId: string,
    title: string,
    message: string,
    type: string,
  ): Promise<InAppNotificationEntity> {
    return this.repo.save(this.repo.create({ staffId, title, message, type }));
  }

  findForStaff(staffId: string, limit = 50): Promise<InAppNotificationEntity[]> {
    return this.repo.find({
      where: { staffId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(id: number, staffId: string): Promise<InAppNotificationEntity> {
    const notification = await this.repo.findOne({ where: { id, staffId } });
    if (!notification) {
      throw new NotFoundException(`Notification #${id} not found`);
    }
    notification.isRead = true;
    return this.repo.save(notification);
  }

  async getUnreadCount(staffId: string): Promise<number> {
    return this.repo.count({ where: { staffId, isRead: false } });
  }

  // ── Guardian notifications ─────────────────────────────────────────────────

  async createForGuardian(
    guardianId: string,
    title: string,
    message: string,
    type: string,
    metadata?: Record<string, unknown>,
  ): Promise<GuardianNotificationEntity> {
    return this.guardianRepo.save(
      this.guardianRepo.create({ guardianId, title, message, type, metadata: metadata ?? null }),
    );
  }

  findForGuardian(guardianId: string, limit = 50): Promise<GuardianNotificationEntity[]> {
    return this.guardianRepo.find({
      where: { guardianId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markReadForGuardian(
    id: number,
    guardianId: string,
  ): Promise<GuardianNotificationEntity> {
    const notification = await this.guardianRepo.findOne({ where: { id, guardianId } });
    if (!notification) {
      throw new NotFoundException(`Guardian notification #${id} not found`);
    }
    notification.isRead = true;
    return this.guardianRepo.save(notification);
  }

  async getGuardianUnreadCount(guardianId: string): Promise<number> {
    return this.guardianRepo.count({ where: { guardianId, isRead: false } });
  }
}
