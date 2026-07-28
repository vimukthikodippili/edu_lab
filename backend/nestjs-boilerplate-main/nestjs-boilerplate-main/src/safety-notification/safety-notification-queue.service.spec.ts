import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { SafetyNotificationQueueService } from './safety-notification-queue.service';
import {
  DeliveryChannel,
  DeliveryStatus,
  NotificationDeliveryLogEntity,
} from './entities/notification-delivery-log.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  create: jest.fn((d: unknown) => ({ ...(d as object) }) as T),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const CTX = {
  alertId: 'alert-uuid',
  sessionId: 'session-uuid',
  studentId: 'student-uuid',
  recipientStaffId: 'staff-uuid',
  channel: DeliveryChannel.SMS,
};

describe('SafetyNotificationQueueService', () => {
  let service: SafetyNotificationQueueService;
  let repo: MockRepo<NotificationDeliveryLogEntity>;

  beforeEach(async () => {
    repo = repoMock<NotificationDeliveryLogEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyNotificationQueueService,
        { provide: getRepositoryToken(NotificationDeliveryLogEntity), useValue: repo },
      ],
    }).compile();

    service = module.get<SafetyNotificationQueueService>(SafetyNotificationQueueService);
    // Mocked instant so tests don't real-wait the ~14s cumulative backoff.
    jest.spyOn(service as unknown as { scheduleDelay: (ms: number) => Promise<void> }, 'scheduleDelay')
      .mockResolvedValue(undefined);
  });

  describe('runAttempts', () => {
    it('AI-prompt test (a): retries and succeeds after one simulated provider failure', async () => {
      const send = jest.fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(undefined);
      const log = repo.create!({ ...CTX, status: DeliveryStatus.QUEUED, attempts: 0 }) as NotificationDeliveryLogEntity;

      const result = await service.runAttempts(log, send);

      expect(send).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(DeliveryStatus.SENT);
      expect(result.attempts).toBe(2);
    });

    it('AI-prompt test (b): marks failed after max 3 retries (4 total attempts)', async () => {
      const send = jest.fn().mockRejectedValue(new Error('network down'));
      const log = repo.create!({ ...CTX, status: DeliveryStatus.QUEUED, attempts: 0 }) as NotificationDeliveryLogEntity;
      const delaySpy = jest.spyOn(
        service as unknown as { scheduleDelay: (ms: number) => Promise<void> },
        'scheduleDelay',
      );

      const result = await service.runAttempts(log, send);

      expect(send).toHaveBeenCalledTimes(4);
      expect(result.status).toBe(DeliveryStatus.FAILED);
      expect(result.attempts).toBe(4);
      expect(delaySpy).toHaveBeenCalledTimes(3);
      expect(delaySpy).toHaveBeenNthCalledWith(1, 2000);
      expect(delaySpy).toHaveBeenNthCalledWith(2, 4000);
      expect(delaySpy).toHaveBeenNthCalledWith(3, 8000);
    });

    it('marks status RETRYING (not FAILED) on an intermediate failed attempt', async () => {
      const send = jest.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockResolvedValueOnce(undefined);
      const log = repo.create!({ ...CTX, status: DeliveryStatus.QUEUED, attempts: 0 }) as NotificationDeliveryLogEntity;
      const saveCalls: DeliveryStatus[] = [];
      repo.save!.mockImplementation((d: unknown) => {
        saveCalls.push((d as NotificationDeliveryLogEntity).status);
        return Promise.resolve(d);
      });

      await service.runAttempts(log, send);

      expect(saveCalls[0]).toBe(DeliveryStatus.RETRYING);
      expect(saveCalls[saveCalls.length - 1]).toBe(DeliveryStatus.SENT);
    });

    it('succeeds on the first attempt with no retries at all', async () => {
      const send = jest.fn().mockResolvedValue(undefined);
      const log = repo.create!({ ...CTX, status: DeliveryStatus.QUEUED, attempts: 0 }) as NotificationDeliveryLogEntity;

      const result = await service.runAttempts(log, send);

      expect(send).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(DeliveryStatus.SENT);
      expect(result.attempts).toBe(1);
    });
  });

  describe('createLogAndDispatch', () => {
    it('persists a log row and resolves once attempt 1 completes', async () => {
      const send = jest.fn().mockResolvedValue(undefined);

      const log = await service.createLogAndDispatch(CTX, send);

      expect(log.status).toBe(DeliveryStatus.SENT);
      expect(log.attempts).toBe(1);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...CTX, status: DeliveryStatus.QUEUED, attempts: 0 }),
      );
    });

    it('does not block on retries — resolves after attempt 1 fails, before the backoff delay resolves', async () => {
      const send = jest.fn().mockRejectedValue(new Error('down'));
      // scheduleDelay never resolves in this test, so if createLogAndDispatch waited on it, the
      // test would hang/timeout — proving the retry tail truly isn't awaited by the caller.
      jest.spyOn(
        service as unknown as { scheduleDelay: (ms: number) => Promise<void> },
        'scheduleDelay',
      ).mockReturnValue(new Promise(() => {}));

      const log = await service.createLogAndDispatch(CTX, send);

      expect(log.status).toBe(DeliveryStatus.RETRYING);
      expect(log.attempts).toBe(1);
    });
  });
});
