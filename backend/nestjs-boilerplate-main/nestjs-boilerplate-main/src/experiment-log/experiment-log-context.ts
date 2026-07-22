import { LabBookingEntity } from '../labs/entities/lab-booking.entity';
import { LabEntity } from '../labs/entities/lab.entity';

export interface ExperimentLogBookingContext {
  labBookingId: string;
  date: string;
  periodNumber: number;
  classSectionId: number | null;
  classSectionName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  teacherId: string;
  teacherName: string;
  labId: string;
  labName: string;
}

/** Pure pre-fill logic (FR-P3-ER-02: "auto-prefilled with date, class, subject, and lab name")
 * — a standalone function, not a service method, so it's directly unit-testable without mocking
 * any repository. `booking` already eager-loads classSection/subject/teacher (see
 * LabBookingEntity); `lab` is passed in separately since LabBookingEntity.lab is deliberately
 * not eager (mirrors how every other lab-family service batch-fetches labs on the side). */
export function buildBookingContext(booking: LabBookingEntity, lab: LabEntity): ExperimentLogBookingContext {
  return {
    labBookingId: booking.id,
    date: booking.date,
    periodNumber: booking.periodNumber,
    classSectionId: booking.classSectionId,
    classSectionName: booking.classSection?.name ?? null,
    subjectId: booking.subjectId,
    subjectName: booking.subject?.name ?? null,
    teacherId: booking.teacherId,
    teacherName: `${booking.teacher.firstName} ${booking.teacher.lastName}`,
    labId: lab.id,
    labName: lab.name,
  };
}
