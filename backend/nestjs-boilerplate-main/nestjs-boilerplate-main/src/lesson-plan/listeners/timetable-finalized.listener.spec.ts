import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { TimetableFinalizedListener } from './timetable-finalized.listener';
import { TimetableFinalizedEvent } from '../../timetable/events/timetable-finalized.event';

describe('TimetableFinalizedListener', () => {
  it('logs that the annual lesson plan window has opened when a timetable is finalized', () => {
    const listener = new TimetableFinalizedListener();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const event = new TimetableFinalizedEvent('2026', new Date('2026-01-10'), ['teacher-A', 'teacher-B']);
    listener.handle(event);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Timetable finalized for 2026'),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('2 teacher(s)'),
    );

    logSpy.mockRestore();
  });
});
