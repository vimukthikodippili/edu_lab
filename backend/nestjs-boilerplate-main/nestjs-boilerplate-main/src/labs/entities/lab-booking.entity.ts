import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LabEntity } from './lab.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { TimetableEntryEntity } from '../../timetable/entities/timetable-entry.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';

export type LabBookingStatus = 'confirmed' | 'cancelled';

/** A lab booking for one date + period, optionally linked to the teacher's real timetable
 * slot. Only one CONFIRMED booking may exist per labId+date+periodNumber — enforced here via
 * LabBookingService.assertNoConflict and, as a DB-level backstop, a partial unique index (see
 * migration ExtendLabBookingForScheduling1791700000000; TypeORM's @Index decorator can't express
 * a WHERE clause, so it isn't mirrored here). `classSectionId`/`subjectId`/`timetableEntryId` are
 * nullable at the DB level only to avoid destroying the one pre-existing dev-DB booking row that
 * predates these columns — the DTO requires them for every new booking. `labId` cascades on
 * delete — a booking has no independent meaning once its lab is gone. */
@Entity({ name: 'lab_booking' })
export class LabBookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  labId: string;

  @ManyToOne(() => LabEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labId' })
  lab: LabEntity;

  @Column({ type: 'date' })
  date: string;

  // Abstract period number, matching TimetableEntryEntity.period's own convention — resolved to
  // a real wall-clock window via the shared freePeriod config, not a stored clock time.
  @Column({ type: 'smallint' })
  periodNumber: number;

  @Column({ type: 'int', nullable: true })
  timetableEntryId: number | null;

  @ManyToOne(() => TimetableEntryEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'timetableEntryId' })
  timetableEntry: TimetableEntryEntity | null;

  @Column({ type: 'int', nullable: true })
  classSectionId: number | null;

  @ManyToOne(() => ClassSectionEntity, { eager: true, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'classSectionId' })
  classSection: ClassSectionEntity | null;

  @Column({ type: 'uuid', nullable: true })
  subjectId: string | null;

  @ManyToOne(() => SubjectEntity, { eager: true, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity | null;

  @Column({ type: 'uuid' })
  teacherId: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacherId' })
  teacher: StaffEntity;

  @Column({ type: 'varchar', default: 'confirmed' })
  status: LabBookingStatus;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  cancelledByStaffId: string | null;

  @ManyToOne(() => StaffEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cancelledByStaffId' })
  cancelledByStaff: StaffEntity | null;

  @CreateDateColumn()
  createdAt: Date;
}
