import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';

export enum GuardianRelationship {
  FATHER = 'father',
  MOTHER = 'mother',
  SIBLING = 'sibling',
  UNCLE = 'uncle',
  AUNT = 'aunt',
  GRANDPARENT = 'grandparent',
  OTHER = 'other',
}

@Entity({ name: 'guardian' })
export class GuardianEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'enum', enum: GuardianRelationship })
  relationship: GuardianRelationship;

  @Column({ type: 'varchar' })
  nic: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'boolean', default: false })
  biometricEnrolled: boolean;

  @Column({ type: 'boolean', default: false })
  isBlacklisted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
