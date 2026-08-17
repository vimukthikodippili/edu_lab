import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { SubjectSelectionWindowEntity } from './subject-selection-window.entity';

// A window's admin-curated core-subject list (auto-included, non-removable by the student).
// Exact structural mirror of ALStreamSubjectEntity.
@Entity({ name: 'subject_selection_window_core_subject' })
export class SubjectSelectionWindowCoreSubjectEntity {
  @PrimaryColumn({ type: 'uuid' })
  windowId: string;

  @PrimaryColumn({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => SubjectSelectionWindowEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'windowId' })
  window: SubjectSelectionWindowEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;
}

// A window's admin-curated optional-subject pool (the student chooses min..max from these).
@Entity({ name: 'subject_selection_window_optional_subject' })
export class SubjectSelectionWindowOptionalSubjectEntity {
  @PrimaryColumn({ type: 'uuid' })
  windowId: string;

  @PrimaryColumn({ type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => SubjectSelectionWindowEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'windowId' })
  window: SubjectSelectionWindowEntity;

  @ManyToOne(() => SubjectEntity, { nullable: false, eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: SubjectEntity;
}
