import { buildBookingContext } from './experiment-log-context';
import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';

describe('buildBookingContext — the explicitly-requested pre-fill logic test', () => {
  it('derives date, class, subject, teacher, and lab name exactly from the booking and lab', () => {
    const booking = {
      id: 'booking-1',
      date: '2026-08-15',
      periodNumber: 3,
      classSectionId: 27,
      classSection: { name: 'Grade 10 - C' },
      subjectId: 'subject-uuid',
      subject: { name: 'Chemistry' },
      teacherId: 'teacher-uuid',
      teacher: { firstName: 'Nimal', lastName: 'Perera' },
    } as unknown as LabBookingEntity;

    const lab = { id: 'lab-uuid', name: 'Chemistry Lab 1' } as LabEntity;

    const context = buildBookingContext(booking, lab);

    expect(context).toEqual({
      labBookingId: 'booking-1',
      date: '2026-08-15',
      periodNumber: 3,
      classSectionId: 27,
      classSectionName: 'Grade 10 - C',
      subjectId: 'subject-uuid',
      subjectName: 'Chemistry',
      teacherId: 'teacher-uuid',
      teacherName: 'Nimal Perera',
      labId: 'lab-uuid',
      labName: 'Chemistry Lab 1',
    });
  });

  it('falls back to null class/subject names when the booking has no class/subject link (an ad-hoc, unlinked booking)', () => {
    const booking = {
      id: 'booking-2',
      date: '2026-08-16',
      periodNumber: 1,
      classSectionId: null,
      classSection: null,
      subjectId: null,
      subject: null,
      teacherId: 'teacher-uuid',
      teacher: { firstName: 'Nimal', lastName: 'Perera' },
    } as unknown as LabBookingEntity;

    const lab = { id: 'lab-uuid', name: 'Chemistry Lab 1' } as LabEntity;

    const context = buildBookingContext(booking, lab);

    expect(context.classSectionName).toBeNull();
    expect(context.subjectName).toBeNull();
    expect(context.labName).toBe('Chemistry Lab 1');
  });
});
