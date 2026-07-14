import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

// One row per student per gated assessment — mirrors AttendanceRecordEntity's shape,
// the closest existing precedent for "one row per student per class-session event".
@Index('UQ_amc_assessment_student', ['assessmentId', 'studentId'], { unique: true })
@Entity({ name: 'assessment_materials_check' })
export class AssessmentMaterialsCheckEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  assessmentId: string;

  @Column({ type: 'uuid' })
  studentId: string;

  @Column({ type: 'boolean' })
  hasFullMaterials: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'uuid' })
  checkedByStaffId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
