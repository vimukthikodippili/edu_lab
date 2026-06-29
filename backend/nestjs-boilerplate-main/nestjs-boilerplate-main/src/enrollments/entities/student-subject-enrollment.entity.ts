import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { SubjectEntity } from '../../subjects/entities/subject.entity';

@Entity({ name: 'student_subject_enrollment' })
export class StudentSubjectEnrollmentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;

  @CreateDateColumn()
  enrolledAt: Date;
}
