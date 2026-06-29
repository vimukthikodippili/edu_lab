import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';
import { StaffRoleAssignmentEntity } from './staff-role-assignment.entity';

export enum StaffStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  RESIGNED = 'resigned',
  RETIRED = 'retired',
}

@Entity({ name: 'staff' })
export class StaffEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  employeeNumber: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar' })
  designation: string;

  @Column({ type: 'varchar' })
  department: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar', unique: true })
  nicNumber: string;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'jsonb', default: [] })
  qualifications: string[];

  @Column({ type: 'enum', enum: StaffStatus, default: StaffStatus.ACTIVE })
  status: StaffStatus;

  @Column({ type: 'uuid', nullable: true })
  photoId: string | null;

  @ManyToOne(() => FileEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'photoId' })
  photo: FileEntity | null;

  @OneToMany(() => StaffRoleAssignmentEntity, (r) => r.staff, {
    cascade: true,
    eager: true,
  })
  roleAssignments: StaffRoleAssignmentEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
