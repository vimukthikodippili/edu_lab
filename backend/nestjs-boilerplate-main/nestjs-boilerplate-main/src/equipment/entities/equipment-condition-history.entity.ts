import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { EquipmentEntity, EquipmentCondition } from './equipment.entity';

/** Immutable log of every condition change on an equipment item — "condition history is
 * retained" per the AC. Never updated or deleted, only appended to. */
@Entity({ name: 'equipment_condition_history' })
export class EquipmentConditionHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => EquipmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipmentId' })
  equipment: EquipmentEntity;

  @Column({ type: 'varchar' })
  previousCondition: EquipmentCondition;

  @Column({ type: 'varchar' })
  newCondition: EquipmentCondition;

  @Column({ type: 'uuid' })
  changedById: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changedById' })
  changedBy: StaffEntity;

  @CreateDateColumn()
  changedAt: Date;
}
