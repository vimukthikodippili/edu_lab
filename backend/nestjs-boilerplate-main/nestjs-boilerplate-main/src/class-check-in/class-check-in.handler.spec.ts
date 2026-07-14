import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassCheckInHandler } from './class-check-in.handler';
import { ClassCheckInService } from './class-check-in.service';
import { LiveSessionStartedEvent } from '../lms/events/live-session-started.event';

describe('ClassCheckInHandler', () => {
  let handler: ClassCheckInHandler;
  let classCheckInService: { checkInFromLiveSession: jest.Mock };

  beforeEach(async () => {
    classCheckInService = { checkInFromLiveSession: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassCheckInHandler,
        { provide: ClassCheckInService, useValue: classCheckInService },
      ],
    }).compile();

    handler = module.get<ClassCheckInHandler>(ClassCheckInHandler);
  });

  it('creates the record by calling checkInFromLiveSession with the event fields on session start', async () => {
    classCheckInService.checkInFromLiveSession.mockResolvedValue({ id: 'checkin-1' });
    const event = new LiveSessionStartedEvent('session-1', 27, 'subject-1', 'teacher-1');

    await handler.handleLiveSessionStarted(event);

    expect(classCheckInService.checkInFromLiveSession).toHaveBeenCalledWith(
      27,
      'subject-1',
      'teacher-1',
    );
  });

  it('catches and logs a failure from the service rather than rethrowing it', async () => {
    classCheckInService.checkInFromLiveSession.mockRejectedValue(new Error('db unavailable'));
    const event = new LiveSessionStartedEvent('session-1', 27, 'subject-1', 'teacher-1');

    await expect(handler.handleLiveSessionStarted(event)).resolves.toBeUndefined();
  });
});
