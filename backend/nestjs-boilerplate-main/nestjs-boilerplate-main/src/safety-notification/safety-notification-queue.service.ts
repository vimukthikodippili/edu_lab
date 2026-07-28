import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryChannel,
  DeliveryStatus,
  NotificationDeliveryLogEntity,
} from './entities/notification-delivery-log.entity';

export interface DeliveryContext {
  alertId: string;
  sessionId: string;
  studentId: string;
  recipientStaffId: string;
  channel: DeliveryChannel;
}

// 1 initial attempt + these 3 retry delays (2s/4s/8s exponential backoff, ~14s cumulative,
// comfortably under the AI prompt's 30s cap) = 4 total attempts, matching AC #2's "retries up to
// 3 times" and the AI prompt's test (b) "max 3 retries before marking failed."
const RETRY_DELAYS_MS = [2000, 4000, 8000];

/** MHA-133 — AC #1/#2/#5, NFR-MHA-02. A dependency-free "dedicated high-priority queue": its own
 * class, entirely separate from NotificationService's in-app notifications and the
 * EventEmitter-based absence listener — no other notification path in this app writes to
 * `notification_delivery_log` or shares this service. This project has no BullMQ/Redis anywhere
 * (confirmed by a full dependency search before writing this), so "queue" here means a durable
 * delivery-log row + an in-process retry loop, not a literal job-queue library.
 *
 * "Concurrency=1" is per-delivery (a delivery's attempt N+1 never starts before attempt N
 * resolves), not a single global worker shared by every recipient — serializing every recipient's
 * full retry-with-backoff cycle behind each other would blow past AC #1's 5-second delivery
 * budget for every recipient after the first. */
@Injectable()
export class SafetyNotificationQueueService {
  private readonly logger = new Logger(SafetyNotificationQueueService.name);

  constructor(
    @InjectRepository(NotificationDeliveryLogEntity)
    private readonly repo: Repository<NotificationDeliveryLogEntity>,
  ) {}

  /** Overridable so tests can resolve instantly instead of real-waiting up to ~14s. */
  protected scheduleDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Awaits only log-row creation + attempt #1's outcome; any further retries continue in the
   * background (fire-and-forget from the caller's perspective) — keeps SafetyFlagEscalationService
   * .escalate()'s existing fast-return contract (FR-MHA-16) intact. */
  async createLogAndDispatch(
    ctx: DeliveryContext,
    send: () => Promise<void>,
  ): Promise<NotificationDeliveryLogEntity> {
    const log = await this.repo.save(
      this.repo.create({ ...ctx, status: DeliveryStatus.QUEUED, attempts: 0 }),
    );
    await this.runAttempt(log, send, false); // attempt 1 — never the final possible attempt
    if (log.status !== DeliveryStatus.SENT) {
      this.continueRetrying(log, send).catch((e) =>
        this.logger.error(`Safety notification dispatch crashed: ${e}`),
      );
    }
    return log;
  }

  /** Runs the full 1-initial + 3-retry cycle to completion (always resolves, never throws) —
   * directly unit-tested (AI-prompt tests a/b) by awaiting it with scheduleDelay mocked instant. */
  async runAttempts(
    log: NotificationDeliveryLogEntity,
    send: () => Promise<void>,
  ): Promise<NotificationDeliveryLogEntity> {
    await this.runAttempt(log, send, false);
    if (log.status !== DeliveryStatus.SENT) {
      await this.continueRetrying(log, send);
    }
    return log;
  }

  private async continueRetrying(
    log: NotificationDeliveryLogEntity,
    send: () => Promise<void>,
  ): Promise<void> {
    for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
      await this.scheduleDelay(RETRY_DELAYS_MS[i]);
      const isLastAttempt = i === RETRY_DELAYS_MS.length - 1;
      await this.runAttempt(log, send, isLastAttempt);
      if (log.status === DeliveryStatus.SENT) return;
      if (isLastAttempt) {
        this.logger.error(
          `Safety notification permanently failed after ${log.attempts} attempts.`,
        );
      }
    }
  }

  /** One send attempt: increments attempts, records the timestamp, and persists the outcome.
   * `isFinalPossibleAttempt` controls whether a failure lands on FAILED (no more retries left) or
   * RETRYING (more attempts still to come). */
  private async runAttempt(
    log: NotificationDeliveryLogEntity,
    send: () => Promise<void>,
    isFinalPossibleAttempt: boolean,
  ): Promise<void> {
    log.attempts += 1;
    log.lastAttemptAt = new Date();
    try {
      await send();
      log.status = DeliveryStatus.SENT;
    } catch {
      log.status = isFinalPossibleAttempt ? DeliveryStatus.FAILED : DeliveryStatus.RETRYING;
    }
    await this.repo.save(log);
  }
}
