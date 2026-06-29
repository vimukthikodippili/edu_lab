import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { TimetableFinalizedEvent } from '../timetable/events/timetable-finalized.event';

@Injectable()
export class NotificationHandler {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('timetable.finalized')
  async handleTimetableFinalized(event: TimetableFinalizedEvent): Promise<void> {
    await Promise.all(
      event.teacherIds.map((staffId) =>
        this.notificationService.createForStaff(
          staffId,
          'Timetable Finalized',
          `Your weekly timetable for ${event.academicYear} has been finalized. You can now plan your lessons.`,
          'timetable_finalized',
        ),
      ),
    );
  }
}
