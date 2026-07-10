import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GradeEntity } from './grade.entity';

@Entity({ name: 'class_section' })
export class ClassSectionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string; // "A", "B", "Science", "Arts"

  @Column({ type: 'varchar' })
  academicYear: string; // "2026"

  @ManyToOne(() => GradeEntity, { eager: true, nullable: false })
  grade: GradeEntity;

  @Column({ type: 'int' })
  gradeId: number;

  @Column({ type: 'uuid', nullable: true })
  classTeacherStaffId: string | null;
}
