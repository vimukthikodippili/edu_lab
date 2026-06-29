import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InAppNotificationEntity } from './entities/in-app-notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(InAppNotificationEntity)
    private readonly repo: Repository<InAppNotificationEntity>,
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
}
