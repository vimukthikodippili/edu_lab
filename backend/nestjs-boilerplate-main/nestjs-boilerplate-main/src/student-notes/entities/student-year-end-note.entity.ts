import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'student_year_end_note' })
@Unique(['studentId', 'academicYear'])
export class StudentYearEndNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'uuid' })
  classTeacherStaffId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string | null;

  @Column({ type: 'text', nullable: true })
  extracurricularActivities: string | null;

  @Column({ type: 'text', nullable: true })
  generalRemarks: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
