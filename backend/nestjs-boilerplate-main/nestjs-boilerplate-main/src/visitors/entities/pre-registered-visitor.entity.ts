import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { VisitorIdType, VisitorType } from './visitor.entity';

/** P5-VM-01 — FR-P5-VM-04. Created ahead of time by any staff member expecting a visitor;
 * `consumedVisitorLogId` is set when a real sign-in is matched against this record, mirroring the
 * Events module's pre-registration-then-consume-at-check-in shape
 * (`EventRegistrationEntity` -> `EventAttendanceService.scanCode()`). */
@Entity({ name: 'pre_registered_visitor' })
export class PreRegisteredVisitorEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  idNumber: string | null;

  @Column({ type: 'enum', enum: VisitorIdType, enumName: 'visitor_id_type', nullable: true })
  idType: VisitorIdType | null;

  @Column({ type: 'enum', enum: VisitorType, enumName: 'visitor_type' })
  visitorType: VisitorType;

  @Column({ type: 'text' })
  purpose: string;

  @Column({ type: 'date' })
  expectedDate: string;

  @Column({ type: 'uuid' })
  hostStaffId: string;

  @Column({ type: 'uuid' })
  createdByStaffId: string;

  @Column({ type: 'uuid', nullable: true })
  consumedVisitorLogId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
