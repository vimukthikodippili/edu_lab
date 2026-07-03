import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeaveApprovedEvent } from '../../leave/events/leave-approved.event';
import { SubstituteService } from '../substitute.service';

@Injectable()
export class SubstituteSuggestionListener {
  private readonly logger = new Logger(SubstituteSuggestionListener.name);

  constructor(private readonly substituteService: SubstituteService) {}

  @OnEvent('leave.approved', { async: true })
  async handle(event: LeaveApprovedEvent): Promise<void> {
    try {
      await this.substituteService.processLeaveApprovedEvent(event);
    } catch (err) {
      this.logger.error(
        `Failed to process substitute suggestions for leave ${event.leaveRequestId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
