import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentGuardianEntity } from './student-guardian.entity';

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

  @Column({ type: 'varchar', nullable: true })
  pushToken: string | null;

  @Column({ type: 'boolean', default: false })
  biometricEnrolled: boolean;

  @Column({ type: 'boolean', default: false })
  isBlacklisted: boolean;

  // ID-proof document (NIC scan, birth certificate, etc.)
  @Column({ type: 'uuid', nullable: true })
  idProofFileId: string | null;

  @ManyToOne(() => FileEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'idProofFileId' })
  idProof: FileEntity | null;

  @OneToMany(() => StudentGuardianEntity, (sg) => sg.guardian)
  studentGuardians: StudentGuardianEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Transient field — populated by StudentEntity.populateGuardians() @AfterLoad hook.
  // Not a DB column; TypeORM ignores it. class-transformer includes it in responses
  // so the caller knows which position in a student's list is the primary contact.
  isPrimaryContact?: boolean;
}
