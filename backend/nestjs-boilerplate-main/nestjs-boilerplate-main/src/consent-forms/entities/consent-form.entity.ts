import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum ConsentTargetType {
  ALL_PARENTS = 'all_parents',
  SPECIFIC_GRADES = 'specific_grades',
  SPECIFIC_STUDENTS = 'specific_students',
}

/** P5-PP-04 — FR-P5-PP-18/19. `targetGrades`/`targetStudentIds` are `jsonb`, not native Postgres
 * arrays — matches the established list-of-values convention across every other Phase 5 entity.
 * Target audience is resolved live off these columns (not snapshotted at creation) so a student
 * added to a targeted grade later is automatically picked up. No `schoolId` — matches the
 * established single-tenant precedent. */
@Entity({ name: 'consent_form' })
export class ConsentFormEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ConsentTargetType, enumName: 'consent_target_type' })
  targetType: ConsentTargetType;

  @Column({ type: 'jsonb', nullable: true })
  targetGrades: number[] | null;

  @Column({ type: 'jsonb', nullable: true })
  targetStudentIds: string[] | null;

  @Column({ type: 'date' })
  deadline: string;

  @Column({ type: 'uuid' })
  createdByStaffId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
