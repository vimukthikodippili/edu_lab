import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

/** P5-EH — FR-P5-EH-04/05/06/07. One row per seated student for one exam. `specialNeeds` is a
 * per-allocation-run snapshot (see plan's design decision — no persistent student-level flag
 * exists yet). Unique `(examId, studentId)` — one seat per student per exam; unique
 * `(examId, examSeatId)` — one student per seat per exam, preventing double-booking within the
 * same sitting (the same physical seat is freely reused across different exams/dates). */
@Entity({ name: 'exam_seat_allocation' })
@Unique(['examId', 'studentId'])
@Unique(['examId', 'examSeatId'])
export class ExamSeatAllocationEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  examId: string;

  @Column({ type: 'uuid' })
  examHallId: string;

  @Column({ type: 'uuid' })
  examSeatId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'boolean', default: false })
  specialNeeds: boolean;

  @Column({ type: 'timestamptz' })
  allocatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
