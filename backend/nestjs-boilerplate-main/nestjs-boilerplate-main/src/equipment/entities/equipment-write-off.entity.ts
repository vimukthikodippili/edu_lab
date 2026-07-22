import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { EquipmentEntity } from './equipment.entity';

/** Immutable log of every write-off (damaged/lost items) against an equipment item — the
 * quantity here is what was written off in this single action, not a running total. */
@Entity({ name: 'equipment_write_off' })
export class EquipmentWriteOffEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  equipmentId: string;

  @ManyToOne(() => EquipmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipmentId' })
  equipment: EquipmentEntity;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid' })
  writtenOffById: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'writtenOffById' })
  writtenOffBy: StaffEntity;

  @CreateDateColumn()
  writtenOffAt: Date;
}
