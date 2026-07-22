import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LabEntity } from '../../labs/entities/lab.entity';
import { EquipmentCategoryEntity } from './equipment-category.entity';

export type EquipmentCondition = 'good' | 'fair' | 'poor';

/** A lab's registered equipment item. `minStockLevel` presence alone marks an item as a tracked
 * consumable for the low-stock cron — no separate boolean needed. `lowStockNotifiedAt` is a
 * disclosed addition beyond the literal model: it's the crossing-based idempotency guard so the
 * daily stock check notifies once per low-stock crossing, not once per day it stays low. `labId`
 * cascades on delete — equipment has no independent meaning once its lab is gone, mirroring
 * LabBookingEntity's own choice. */
@Entity({ name: 'equipment' })
export class EquipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  labId: string;

  @ManyToOne(() => LabEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'labId' })
  lab: LabEntity;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => EquipmentCategoryEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoryId' })
  category: EquipmentCategoryEntity;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar', length: 30 })
  unit: string;

  @Column({ type: 'varchar', default: 'good' })
  condition: EquipmentCondition;

  @Column({ type: 'varchar', length: 120, nullable: true })
  serialNumber: string | null;

  @Column({ type: 'date' })
  purchaseDate: string;

  @Column({ type: 'int', nullable: true })
  minStockLevel: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  lowStockNotifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
