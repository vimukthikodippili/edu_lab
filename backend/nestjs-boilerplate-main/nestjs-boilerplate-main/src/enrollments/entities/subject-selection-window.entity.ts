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
import { GradeStageEntity } from '../../students/entities/grade-stage.entity';

// A per-grade-stage, admin-curated selection period. Which subjects are "core" vs "optional"
// for this window is stored explicitly (subject_selection_window_core_subject /
// subject_selection_window_optional_subject) rather than inferred from SubjectCategoryEntity —
// this codebase has no existing subject-to-grade-band mapping, so explicit per-window curation
// is required regardless of grade band. The same shape serves both Grade 10+ elective windows
// and Grade 6-9 aesthetic windows (aesthetic = an optional pool of just Aesthetics-category
// subjects with minOptionalSubjects = maxOptionalSubjects = 1).
@Entity({ name: 'subject_selection_window' })
export class SubjectSelectionWindowEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gradeStageId: string;

  @ManyToOne(() => GradeStageEntity, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'gradeStageId' })
  gradeStage: GradeStageEntity;

  @Column({ type: 'varchar', length: 4 })
  academicYear: string;

  @Column({ type: 'timestamptz' })
  openDate: Date;

  @Column({ type: 'timestamptz' })
  closeDate: Date;

  // Manual force-close/reopen toggle, independent of the date range — mirrors
  // AcademicYearEntity.status. A window is only actually open when isActive AND now() is
  // within [openDate, closeDate].
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  minOptionalSubjects: number;

  @Column({ type: 'int', default: 0 })
  maxOptionalSubjects: number;

  @Column({ type: 'boolean', default: false })
  requiresStreamSelection: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
