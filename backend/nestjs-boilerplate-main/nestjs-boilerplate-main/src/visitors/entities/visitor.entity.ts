import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

export enum VisitorIdType {
  NIC = 'nic',
  PASSPORT = 'passport',
  OTHER = 'other',
}

export enum VisitorType {
  PARENT = 'parent',
  GOVERNMENT_OFFICIAL = 'government_official',
  CONTRACTOR = 'contractor',
  JOB_APPLICANT = 'job_applicant',
  OTHER = 'other',
}

/** P5-VM-01 — FR-P5-VM-01/05/14. A `Visitor` is the reusable person record, matched by
 * (idType, idNumber) across repeat visits — a fresh row per sign-in would make `isBlocked`
 * meaningless, since a blocked person would just get a brand-new, unblocked row next time. */
@Entity({ name: 'visitor' })
@Unique(['idType', 'idNumber'])
export class VisitorEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar' })
  idNumber: string;

  @Column({ type: 'enum', enum: VisitorIdType, enumName: 'visitor_id_type' })
  idType: VisitorIdType;

  @Column({ type: 'enum', enum: VisitorType, enumName: 'visitor_type' })
  visitorType: VisitorType;

  @Column({ type: 'uuid', nullable: true })
  photoId: string | null;

  @ManyToOne(() => FileEntity, { eager: true, nullable: true })
  @JoinColumn({ name: 'photoId' })
  photo: FileEntity | null;

  @Column({ type: 'boolean', default: false })
  isBlocked: boolean;

  @Column({ type: 'text', nullable: true })
  blockedReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
