import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

// The fixed set of colors a standard school paint/palette box is expected to contain.
// Shared by both the pre-activity "has all colors" check (implicitly, all of these) and
// the post-activity "which colors did the student use" record (a subset of these).
export const ART_PALETTE_COLORS = [
  'red',
  'blue',
  'yellow',
  'green',
  'orange',
  'purple',
  'black',
  'white',
  'brown',
  'pink',
] as const;

export type ArtPaletteColor = (typeof ART_PALETTE_COLORS)[number];

// One row per student per art activity — mirrors AssessmentMaterialsCheckEntity's shape
// (one row per student per class-session event), extended with a second nullable field
// for the after-activity phase instead of a separate table, since both phases share the
// same (artActivityId, studentId) identity.
@Index('UQ_aasc_activity_student', ['artActivityId', 'studentId'], { unique: true })
@Entity({ name: 'art_activity_student_check' })
export class ArtActivityStudentCheckEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  artActivityId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  // Before-phase: does this student have every color in their palette box right now?
  @Column({ type: 'boolean', nullable: true })
  hasAllColors: boolean | null;

  // After-phase: which colors did the student actually use while drawing?
  @Column({ type: 'text', array: true, nullable: true })
  colorsUsed: string[] | null;

  @Column({ type: 'uuid', nullable: true })
  checkedByStaffId: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
