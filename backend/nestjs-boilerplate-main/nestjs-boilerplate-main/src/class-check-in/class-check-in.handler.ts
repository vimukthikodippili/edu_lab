import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClassCheckInService } from './class-check-in.service';
import { LiveSessionStartedEvent } from '../lms/events/live-session-started.event';

@Injectable()
export class ClassCheckInHandler {
  private readonly logger = new Logger(ClassCheckInHandler.name);

  constructor(private readonly classCheckInService: ClassCheckInService) {}

  /** EventEmitter2's fire-and-forget emit() won't propagate a rejected async listener back
   * to the emitter, so this listener owns its own resilience — a failure here never surfaces
   * to the teacher hosting the live class. */
  @OnEvent('live_session.started')
  async handleLiveSessionStarted(event: LiveSessionStartedEvent): Promise<void> {
    try {
      await this.classCheckInService.checkInFromLiveSession(
        event.classSectionId,
        event.subjectId,
        event.teacherId,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to auto-check-in for live session ${event.sessionId}: ${message}`,
      );
    }
  }
}
