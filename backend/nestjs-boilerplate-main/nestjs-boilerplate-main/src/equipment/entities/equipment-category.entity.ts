import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { LabTypeEntity } from '../../labs/entities/lab-type.entity';

/** Equipment categories are configurable per lab type (e.g. Science: Glassware, Instruments,
 * Chemicals, Safety) — a school-wide catalog decision, admin/principal-managed, mirroring
 * LabTypeEntity's own shape. */
@Entity({ name: 'equipment_category' })
@Unique(['labTypeId', 'name'])
export class EquipmentCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  labTypeId: string;

  @ManyToOne(() => LabTypeEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'labTypeId' })
  labType: LabTypeEntity;

  @Column({ type: 'varchar' })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
