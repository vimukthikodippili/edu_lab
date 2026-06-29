import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { StaffEntity } from './staff.entity';

export enum StaffFunctionalRole {
  SUBJECT_TEACHER = 'subject_teacher',
  CLASS_TEACHER = 'class_teacher',
  SPORTS_COACH = 'sports_coach',
  SOCIETY_SUPERVISOR = 'society_supervisor',
  EXAM_COORDINATOR = 'exam_coordinator',
  LAB_INSTRUCTOR = 'lab_instructor',
  LIBRARIAN = 'librarian',
  COUNSELOR = 'counselor',
  ACCOUNTANT = 'accountant',
  SECURITY = 'security',
  ADMIN_OFFICER = 'admin_officer',
  OTHER = 'other',
}

@Entity({ name: 'staff_role_assignment' })
export class StaffRoleAssignmentEntity {
  @PrimaryColumn({ type: 'uuid' })
  staffId: string;

  @PrimaryColumn({ type: 'enum', enum: StaffFunctionalRole })
  role: StaffFunctionalRole;

  @ManyToOne(() => StaffEntity, (s) => s.roleAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: StaffEntity;
}
