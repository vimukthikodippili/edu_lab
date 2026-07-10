import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum EnrollmentOutcome {
  PROMOTED = 'promoted',
  REPEATED = 'repeated',
  TRANSFERRED = 'transferred',
  GRADUATED = 'graduated',
  WITHDRAWN = 'withdrawn',
}

@Entity({ name: 'student_enrollment_history' })
@Unique(['studentId', 'academicYear'])
export class StudentEnrollmentHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'int' })
  gradeId: number;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'enum', enum: EnrollmentOutcome })
  outcome: EnrollmentOutcome;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  recordedAt: Date;
}
