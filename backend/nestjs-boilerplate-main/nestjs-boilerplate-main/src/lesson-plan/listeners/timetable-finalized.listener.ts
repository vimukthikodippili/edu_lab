import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TimetableFinalizedEvent } from '../../timetable/events/timetable-finalized.event';

@Injectable()
export class TimetableFinalizedListener {
  private readonly logger = new Logger(TimetableFinalizedListener.name);

  @OnEvent('timetable.finalized')
  handle(event: TimetableFinalizedEvent): void {
    this.logger.log(
      `Timetable finalized for ${event.academicYear} — annual lesson plan window now open for ${event.teacherIds.length} teacher(s).`,
    );
  }
}
