import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { SportEntity } from './sport.entity';
import { StudentEntity } from '../../students/entities/student.entity';

@Entity({ name: 'sport_enrollment' })
@Unique(['sportId', 'studentId'])
export class SportEnrollmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sportId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => SportEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sportId' })
  sport: SportEntity;

  @ManyToOne(() => StudentEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  enrolledAt: Date;
}
