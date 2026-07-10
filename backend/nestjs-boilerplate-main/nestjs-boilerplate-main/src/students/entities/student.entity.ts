import {
  AfterLoad,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { EntityRelationalHelper } from '../../utils/relational-entity-helper';
import { GradeEntity } from './grade.entity';
import { ClassSectionEntity } from './class-section.entity';
import { GuardianEntity } from './guardian.entity';
import { StudentGuardianEntity } from './student-guardian.entity';
import { FileEntity } from '../../files/infrastructure/persistence/relational/entities/file.entity';
import { ALStreamEntity } from '../../enrollments/entities/al-stream.entity';

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

  @Column({ type: 'varchar', length: 500, nullable: true })
  leavingReason: string | null;

  // Links this student's record to their portal login account (UserEntity.id).
  // UserEntity uses a plain numeric auto-increment PK in this codebase (not a
  // uuid, unlike Student/Staff) — this column must match that type.
  // Nullable — most students are enrolled before/without a login account being linked.
  @Column({ type: 'int', nullable: true, unique: true })
  userId: number | null;

  // QR code stored as base64 data URL — encodes admission number for scanner
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

  // Junction entity carries isPrimaryContact per student-guardian pair.
  // @Exclude() hides it from API responses; @AfterLoad populates the flat `guardians` array instead.
  @Exclude()
  @OneToMany(() => StudentGuardianEntity, (sg) => sg.student, { cascade: true })
  studentGuardians: StudentGuardianEntity[];

  // Flat guardian list enriched with `isPrimaryContact` — populated by @AfterLoad, not persisted.
  // Consumers should read guardians from here (not studentGuardians) to get the primary flag inline.
  guardians: (GuardianEntity & { isPrimaryContact: boolean })[] = [];

  @AfterLoad()
  private populateGuardians() {
    if (this.studentGuardians?.length) {
      this.guardians = this.studentGuardians
        .filter((sg) => !!sg.guardian)
        .map((sg) => {
          // Set the transient isPrimaryContact flag directly on the GuardianEntity instance
          // so class-transformer includes it when serializing.
          sg.guardian.isPrimaryContact = sg.isPrimaryContact;
          return sg.guardian as GuardianEntity & { isPrimaryContact: boolean };
        });
    }
  }

  @ManyToOne(() => FileEntity, { eager: true, nullable: true })
  photo: FileEntity | null;

  @Column({ type: 'uuid', nullable: true })
  photoId: string | null;

  @Column({ type: 'int', nullable: true })
  streamId: number | null;

  @ManyToOne(() => ALStreamEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'streamId' })
  stream: ALStreamEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
