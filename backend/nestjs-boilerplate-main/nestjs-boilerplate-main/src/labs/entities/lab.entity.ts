import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LabTypeEntity } from './lab-type.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';

@Entity({ name: 'lab' })
export class LabEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  labTypeId: string;

  @ManyToOne(() => LabTypeEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'labTypeId' })
  labType: LabTypeEntity;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'varchar', length: 50 })
  roomNumber: string;

  @Column({ type: 'uuid' })
  labInChargeId: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'labInChargeId' })
  labInCharge: StaffEntity;

  @Column({ type: 'boolean', default: false })
  isUnderMaintenance: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
