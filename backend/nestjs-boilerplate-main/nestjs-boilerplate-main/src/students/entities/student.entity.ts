import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { GradeEntity } from './grade.entity';
import { ClassSectionEntity } from './class-section.entity';
import { GuardianEntity } from './guardian.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';

export enum StudentGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum StudentStatus {
  ACTIVE = 'active',
  TRANSFERRED = 'transferred',
  GRADUATED = 'graduated',
  WITHDRAWN = 'withdrawn',
}

@Index(['admissionNumber'], { unique: true })
@Entity({ name: 'student' })
export class StudentEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  admissionNumber: string; // Auto-generated: SIMS/2026/00001

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'date' })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: StudentGender })
  gender: StudentGender;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  nicNumber: string | null;

  @Column({ type: 'text', nullable: true })
  medicalNotes: string | null;

  @Column({ type: 'varchar' })
  academicYear: string; // "2026"

  @Column({ type: 'enum', enum: StudentStatus, default: StudentStatus.ACTIVE })
  status: StudentStatus;

  // QR code stored as base64 data URL — encodes student UUID for scanner
  @Column({ type: 'text', nullable: true })
  qrCode: string | null;

  @ManyToOne(() => GradeEntity, { eager: true, nullable: false })
  grade: GradeEntity;

  @Column({ type: 'int' })
  gradeId: number;

  @ManyToOne(() => ClassSectionEntity, { eager: true, nullable: false })
  classSection: ClassSectionEntity;

  @Column({ type: 'int' })
  classSectionId: number;

  @ManyToMany(() => GuardianEntity, { eager: true, cascade: true })
  @JoinTable({
    name: 'student_guardian',
    joinColumn: { name: 'studentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'guardianId', referencedColumnName: 'id' },
  })
  guardians: GuardianEntity[];

  @ManyToOne(() => FileEntity, { eager: true, nullable: true })
  photo: FileEntity | null;

  @Column({ type: 'uuid', nullable: true })
  photoId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
