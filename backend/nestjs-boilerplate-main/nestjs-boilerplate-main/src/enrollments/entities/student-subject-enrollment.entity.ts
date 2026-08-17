import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { SubjectSelectionType } from './subject-selection-request-item.entity';

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

  // Nullable/defaulted so every pre-existing admin-created row is unaffected — these three
  // columns are only ever populated when an enrollment row is created via an approved
  // SubjectSelectionRequest (see SubjectSelectionService.decide()).
  @Column({ type: 'varchar', length: 20, nullable: true })
  selectionType: SubjectSelectionType | null;

  @Column({ type: 'boolean', default: false })
  selectedByStudent: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;
}
