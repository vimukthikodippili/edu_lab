import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';

@Entity({ name: 'teacher_subject_class_requirement' })
export class TeacherSubjectClassRequirementEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  teacherId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @Column({ type: 'int' })
  classSectionId: number;

  @Column({ type: 'int' })
  periodsPerWeek: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => StaffEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'teacherId' })
  teacher: StaffEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;
}
