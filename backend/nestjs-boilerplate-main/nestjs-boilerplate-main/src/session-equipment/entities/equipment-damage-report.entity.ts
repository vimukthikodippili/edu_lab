import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LabBookingEntity } from '../../labs/entities/lab-booking.entity';
import { EquipmentEntity } from '../../equipment/entities/equipment.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { StudentEntity } from '../../students/entities/student.entity';

export type DamageReportType = 'damaged' | 'missing';

/** A permanent, append-only record that an equipment item was damaged or went missing during a
 * lab session — no update/delete route or service method exists for this entity (this
 * codebase's dominant immutability convention), and a DB-level trigger (see migration
 * CreateSessionEquipmentTables) additionally rejects any UPDATE/DELETE outright, mirroring the
 * one existing precedent for this (`class_check_in`'s immutability trigger) since the story
 * explicitly calls for *enforced* append-only, not just an omitted endpoint. */
@Entity({ name: 'equipment_damage_report' })
export class EquipmentDamageReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  labBookingId: string;

  @ManyToOne(() => LabBookingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labBookingId' })
  labBooking: LabBookingEntity;

  @Column({ type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => EquipmentEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipmentId' })
  equipment: EquipmentEntity;

  @Column({ type: 'varchar' })
  reportType: DamageReportType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'uuid', nullable: true })
  responsibleStudentId: string | null;

  @ManyToOne(() => StudentEntity, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsibleStudentId' })
  responsibleStudent: StudentEntity | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid' })
  reportedById: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reportedById' })
  reportedBy: StaffEntity;

  @CreateDateColumn()
  reportedAt: Date;
}
