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

/** What equipment a teacher confirms was used in a specific lab session, and how much. Only
 * consumable items (`equipment.minStockLevel != null`, the same convention established for the
 * low-stock cron) have `quantityUsed` deducted from master stock — durable/reusable equipment
 * (e.g. a microscope) is logged for the record but isn't "consumed." `labBookingId` cascades —
 * a usage log has no independent meaning once its session is gone. */
@Entity({ name: 'session_equipment_usage' })
export class SessionEquipmentUsageEntity {
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

  @Column({ type: 'int' })
  quantityUsed: number;

  @Column({ type: 'uuid' })
  submittedById: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'submittedById' })
  submittedBy: StaffEntity;

  @CreateDateColumn()
  submittedAt: Date;
}
