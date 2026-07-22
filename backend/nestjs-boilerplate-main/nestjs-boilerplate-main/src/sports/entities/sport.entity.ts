import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { SportTypeEntity } from './sport-type.entity';

@Entity({ name: 'sport' })
export class SportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  sportTypeId: string;

  @ManyToOne(() => SportTypeEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sportTypeId' })
  sportType: SportTypeEntity;

  @Column({ type: 'date' })
  seasonStart: Date;

  @Column({ type: 'date' })
  seasonEnd: Date;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid' })
  coachId: string;

  @ManyToOne(() => StaffEntity, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'coachId' })
  coach: StaffEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
