import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

// Forward-reference the two parent entities to avoid circular-import issues.
// We import the class directly here; TypeORM's lazy evaluation handles the cycle.
import { StudentEntity } from './student.entity';
import { GuardianEntity } from './guardian.entity';

/**
 * Junction entity for the student ↔ guardian many-to-many relationship.
 * Carries the `isPrimaryContact` flag so that the same guardian can be the
 * primary contact for one sibling but not another.
 *
 * A PostgreSQL partial unique index (`WHERE isPrimaryContact = TRUE`) enforces
 * the database-level constraint that each student has at most one primary contact.
 */
@Entity({ name: 'student_guardian' })
export class StudentGuardianEntity {
  @PrimaryColumn({ type: 'uuid' })
  studentId: string;

  @PrimaryColumn({ type: 'uuid' })
  guardianId: string;

  @Column({ type: 'boolean', default: false })
  isPrimaryContact: boolean;

  @ManyToOne(() => StudentEntity, (s) => s.studentGuardians, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: StudentEntity;

  // eager: true so StudentEntity.studentGuardians auto-loads the full guardian object
  @ManyToOne(() => GuardianEntity, (g) => g.studentGuardians, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({ name: 'guardianId' })
  guardian: GuardianEntity;
}
