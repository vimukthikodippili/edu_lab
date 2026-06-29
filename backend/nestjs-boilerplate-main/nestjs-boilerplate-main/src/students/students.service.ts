import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { StudentEntity, StudentStatus } from './entities/student.entity';
import { GuardianEntity } from './entities/guardian.entity';
import { StudentGuardianEntity } from './entities/student-guardian.entity';
import { GradeEntity } from './entities/grade.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { CreateClassSectionDto } from './dto/create-class-section.dto';

export interface PaginatedStudents {
  data: StudentEntity[];
  total: number;
  page: number;
  limit: number;
}

/** Relations to load with every student for full detail responses. */
const STUDENT_RELATIONS = [
  'grade',
  'classSection',
  'studentGuardians',
  'studentGuardians.guardian',
  'studentGuardians.guardian.idProof',
  'photo',
];

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepository: Repository<StudentEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepository: Repository<GuardianEntity>,

    @InjectRepository(StudentGuardianEntity)
    private readonly sgRepository: Repository<StudentGuardianEntity>,

    @InjectRepository(GradeEntity)
    private readonly gradeRepository: Repository<GradeEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepository: Repository<ClassSectionEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,

    private readonly dataSource: DataSource,
  ) {}

  // ─── Enrollment ────────────────────────────────────────────────────

  async enroll(dto: CreateStudentDto): Promise<StudentEntity> {
    // 1. Validate grade
    const grade = await this.gradeRepository.findOne({ where: { id: dto.gradeId } });
    if (!grade) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { gradeId: `Grade with id ${dto.gradeId} does not exist.` },
      });
    }

    // 2. Validate class section belongs to the grade
    const classSection = await this.classSectionRepository.findOne({
      where: { id: dto.classSectionId, gradeId: dto.gradeId },
    });
    if (!classSection) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          classSectionId: `ClassSection with id ${dto.classSectionId} does not exist for grade ${dto.gradeId}.`,
        },
      });
    }

    // 3. Validate photo if provided
    let photo: FileEntity | null = null;
    if (dto.photoId) {
      photo = await this.fileRepository.findOne({ where: { id: dto.photoId } });
      if (!photo) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { photoId: `File with id ${dto.photoId} does not exist.` },
        });
      }
    }

    // 4. Guardian presence check (belt-and-suspenders — DTO already enforces @ArrayMinSize(1))
    if (!dto.guardians || dto.guardians.length === 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { guardians: 'At least one guardian must be linked before enrollment is complete.' },
      });
    }

    // 5. Primary-contact validation:
    //    - If none are marked, auto-promote the first guardian.
    //    - If more than one are marked, reject.
    const primaryCount = dto.guardians.filter((g) => g.isPrimaryContact === true).length;
    if (primaryCount > 1) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { guardians: 'Exactly one guardian must be marked as the primary contact.' },
      });
    }
    // primaryIndex: the one explicitly marked, or default to index 0
    const primaryIndex = primaryCount === 1
      ? dto.guardians.findIndex((g) => g.isPrimaryContact === true)
      : 0;

    return this.dataSource.transaction(async (manager) => {
      const admissionNumber = await this.generateAdmissionNumber(manager.getRepository(StudentEntity));
      const qrCode = await this.generateQrCode(admissionNumber);

      // Save guardians first to obtain their UUIDs
      const savedGuardians = await Promise.all(
        dto.guardians.map((g) =>
          manager.save(
            GuardianEntity,
            manager.create(GuardianEntity, {
              firstName: g.firstName,
              lastName: g.lastName,
              relationship: g.relationship,
              nic: g.nic,
              phone: g.phone,
              email: g.email ?? null,
              address: g.address ?? null,
              idProofFileId: g.idProofFileId ?? null,
            }),
          ),
        ),
      );

      // Persist student (no guardians field — junction records come next)
      const student = await manager.save(
        StudentEntity,
        manager.create(StudentEntity, {
          admissionNumber,
          qrCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: new Date(dto.dateOfBirth),
          gender: dto.gender,
          address: dto.address ?? null,
          contactNumber: dto.contactNumber ?? null,
          nicNumber: dto.nicNumber ?? null,
          medicalNotes: dto.medicalNotes ?? null,
          academicYear: String(new Date().getFullYear()),
          status: StudentStatus.ACTIVE,
          gradeId: dto.gradeId,
          classSectionId: dto.classSectionId,
          photoId: photo?.id ?? null,
          photo,
          grade,
          classSection,
        }),
      );

      // Save junction records with isPrimaryContact
      await manager.save(
        StudentGuardianEntity,
        savedGuardians.map((guardian, index) =>
          manager.create(StudentGuardianEntity, {
            studentId: student.id,
            guardianId: guardian.id,
            isPrimaryContact: index === primaryIndex,
          }),
        ),
      );

      // Reload with all relations so @AfterLoad populates the guardians array
      return this.loadStudentViaManager(manager, student.id);
    });
  }

  // ─── Guardian Management ──────────────────────────────────────────

  async addGuardian(studentId: string, dto: AddGuardianDto): Promise<StudentEntity> {
    const student = await this.findById(studentId);

    if (student.studentGuardians.length >= 5) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { guardians: 'A student may have at most 5 guardians.' },
      });
    }

    // Validate idProof file if provided
    if (dto.idProofFileId) {
      const file = await this.fileRepository.findOne({ where: { id: dto.idProofFileId } });
      if (!file) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { idProofFileId: `File with id ${dto.idProofFileId} does not exist.` },
        });
      }
    }

    return this.dataSource.transaction(async (manager) => {
      if (dto.isPrimaryContact) {
        await this.clearPrimaryContact(manager, studentId);
      }

      const guardian = await manager.save(
        GuardianEntity,
        manager.create(GuardianEntity, {
          firstName: dto.firstName,
          lastName: dto.lastName,
          relationship: dto.relationship,
          nic: dto.nic,
          phone: dto.phone,
          email: dto.email ?? null,
          address: dto.address ?? null,
          idProofFileId: dto.idProofFileId ?? null,
        }),
      );

      await manager.save(
        StudentGuardianEntity,
        manager.create(StudentGuardianEntity, {
          studentId,
          guardianId: guardian.id,
          isPrimaryContact: dto.isPrimaryContact,
        }),
      );

      return this.loadStudentViaManager(manager, studentId);
    });
  }

  async updateGuardian(
    studentId: string,
    guardianId: string,
    dto: UpdateGuardianDto,
  ): Promise<StudentEntity> {
    const student = await this.findById(studentId);
    const junction = student.studentGuardians.find((sg) => sg.guardianId === guardianId);

    if (!junction) {
      throw new NotFoundException(
        `Guardian ${guardianId} is not linked to student ${studentId}.`,
      );
    }

    // Cannot unset the only/active primary without designating another
    if (dto.isPrimaryContact === false && junction.isPrimaryContact) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          isPrimaryContact:
            'Cannot remove primary contact status — set another guardian as primary first.',
        },
      });
    }

    // Validate idProof file if changing
    if (dto.idProofFileId !== undefined && dto.idProofFileId !== null) {
      const file = await this.fileRepository.findOne({ where: { id: dto.idProofFileId } });
      if (!file) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { idProofFileId: `File with id ${dto.idProofFileId} does not exist.` },
        });
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // Promote to primary: clear existing primary first
      if (dto.isPrimaryContact === true && !junction.isPrimaryContact) {
        await this.clearPrimaryContact(manager, studentId);
      }

      // Update guardian fields
      await manager.save(
        GuardianEntity,
        manager.create(GuardianEntity, {
          id: guardianId,
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.relationship !== undefined && { relationship: dto.relationship }),
          ...(dto.nic !== undefined && { nic: dto.nic }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.email !== undefined && { email: dto.email ?? null }),
          ...(dto.address !== undefined && { address: dto.address ?? null }),
          ...(dto.idProofFileId !== undefined && { idProofFileId: dto.idProofFileId ?? null }),
        }),
      );

      // Update junction isPrimaryContact if changed
      if (dto.isPrimaryContact !== undefined) {
        await manager.save(
          StudentGuardianEntity,
          manager.create(StudentGuardianEntity, {
            studentId,
            guardianId,
            isPrimaryContact: dto.isPrimaryContact,
          }),
        );
      }

      return this.loadStudentViaManager(manager, studentId);
    });
  }

  async removeGuardian(studentId: string, guardianId: string): Promise<StudentEntity> {
    const student = await this.findById(studentId);

    if (student.studentGuardians.length <= 1) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { guardians: 'Cannot remove the last guardian — at least one must remain.' },
      });
    }

    const junction = student.studentGuardians.find((sg) => sg.guardianId === guardianId);
    if (!junction) {
      throw new NotFoundException(
        `Guardian ${guardianId} is not linked to student ${studentId}.`,
      );
    }

    if (junction.isPrimaryContact) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          guardianId:
            'Cannot remove the primary contact — set another guardian as primary first.',
        },
      });
    }

    return this.dataSource.transaction(async (manager) => {
      // Remove junction record first (FK constraint)
      await manager.delete(StudentGuardianEntity, { studentId, guardianId });
      // Remove the orphaned guardian entity
      await manager.delete(GuardianEntity, { id: guardianId });
      return this.loadStudentViaManager(manager, studentId);
    });
  }

  async setPrimaryContact(studentId: string, guardianId: string): Promise<StudentEntity> {
    const student = await this.findById(studentId);
    const junction = student.studentGuardians.find((sg) => sg.guardianId === guardianId);

    if (!junction) {
      throw new NotFoundException(
        `Guardian ${guardianId} is not linked to student ${studentId}.`,
      );
    }

    if (junction.isPrimaryContact) {
      // Already primary — idempotent; just return current state
      return student;
    }

    return this.dataSource.transaction(async (manager) => {
      await this.clearPrimaryContact(manager, studentId);
      await manager.save(
        StudentGuardianEntity,
        manager.create(StudentGuardianEntity, {
          studentId,
          guardianId,
          isPrimaryContact: true,
        }),
      );
      return this.loadStudentViaManager(manager, studentId);
    });
  }

  // ─── Read ──────────────────────────────────────────────────────────

  async findMany(query: QueryStudentDto): Promise<PaginatedStudents> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.grade', 'grade')
      .leftJoinAndSelect('student.classSection', 'classSection')
      .leftJoinAndSelect('student.studentGuardians', 'sg')
      .leftJoinAndSelect('sg.guardian', 'guardian')
      .leftJoinAndSelect('guardian.idProof', 'idProof')
      .leftJoinAndSelect('student.photo', 'photo')
      .where('student.deletedAt IS NULL');

    if (query.search) {
      qb.andWhere(
        '(student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.admissionNumber ILIKE :search OR guardian.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.gradeId) qb.andWhere('student.gradeId = :gradeId', { gradeId: query.gradeId });
    if (query.classSectionId) qb.andWhere('student.classSectionId = :cid', { cid: query.classSectionId });
    if (query.status) qb.andWhere('student.status = :status', { status: query.status });
    if (query.academicYear) qb.andWhere('student.academicYear = :year', { year: query.academicYear });

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<StudentEntity> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: STUDENT_RELATIONS,
    });
    if (!student) {
      throw new NotFoundException(`Student with id ${id} not found.`);
    }
    return student;
  }

  async findByAdmissionNumber(admissionNumber: string): Promise<StudentEntity> {
    const student = await this.studentRepository.findOne({
      where: { admissionNumber },
      relations: STUDENT_RELATIONS,
    });
    if (!student) {
      throw new NotFoundException(`Student with admission number ${admissionNumber} not found.`);
    }
    return student;
  }

  async findAllGrades(): Promise<GradeEntity[]> {
    return this.gradeRepository.find({ order: { level: 'ASC' } });
  }

  async createClassSection(dto: CreateClassSectionDto): Promise<ClassSectionEntity> {
    const grade = await this.gradeRepository.findOne({ where: { id: dto.gradeId } });
    if (!grade) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { gradeId: `Grade with id ${dto.gradeId} does not exist.` },
      });
    }

    const duplicate = await this.classSectionRepository.findOne({
      where: { gradeId: dto.gradeId, name: dto.name, academicYear: dto.academicYear },
    });
    if (duplicate) {
      throw new ConflictException(
        `Class section '${dto.name}' already exists for ${grade.name} in ${dto.academicYear}.`,
      );
    }

    const section = this.classSectionRepository.create({
      gradeId: dto.gradeId,
      name: dto.name,
      academicYear: dto.academicYear,
    });
    return this.classSectionRepository.save(section);
  }

  async findAllClassSections(gradeId?: number, academicYear?: string): Promise<ClassSectionEntity[]> {
    const where: Record<string, unknown> = {};
    if (gradeId) where.gradeId = gradeId;
    if (academicYear) where.academicYear = academicYear;
    return this.classSectionRepository.find({
      where,
      relations: ['grade'],
      order: { academicYear: 'DESC', gradeId: 'ASC', name: 'ASC' },
    });
  }

  async findClassSections(gradeId: number, academicYear?: string): Promise<ClassSectionEntity[]> {
    const year = academicYear ?? String(new Date().getFullYear());
    return this.classSectionRepository.find({
      where: { gradeId, academicYear: year },
      relations: ['grade'],
      order: { name: 'ASC' },
    });
  }

  // ─── Soft Delete ───────────────────────────────────────────────────

  async withdraw(id: string): Promise<void> {
    const student = await this.findById(id);
    await this.studentRepository.save({ ...student, status: StudentStatus.WITHDRAWN });
    await this.studentRepository.softDelete(id);
  }

  // ─── Private helpers ───────────────────────────────────────────────

  /**
   * Clears the isPrimaryContact flag for ALL junction records of the given student.
   * Must be called inside a transaction before setting a new primary.
   */
  private async clearPrimaryContact(manager: EntityManager, studentId: string): Promise<void> {
    await manager.update(
      StudentGuardianEntity,
      { studentId, isPrimaryContact: true },
      { isPrimaryContact: false },
    );
  }

  /**
   * Loads a student with all detail relations via the provided transactional EntityManager.
   * Used at the end of write operations to return a fully-populated response.
   */
  private async loadStudentViaManager(
    manager: EntityManager,
    studentId: string,
  ): Promise<StudentEntity> {
    const student = await manager.findOne(StudentEntity, {
      where: { id: studentId },
      relations: STUDENT_RELATIONS,
    });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found after save — this should never happen.`);
    }
    return student;
  }

  /**
   * Generates the next sequential admission number for the current academic year.
   * Format: SIMS/YYYY/NNNNN (e.g. SIMS/2026/00001)
   *
   * Called inside a transaction with the transactional repository to keep the
   * sequence read and the INSERT atomic.
   */
  private async generateAdmissionNumber(
    repo: Repository<StudentEntity>,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SIMS/${year}/`;

    const lastStudent = await repo
      .createQueryBuilder('s')
      .where('s.admissionNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.admissionNumber', 'DESC')
      .withDeleted() // Include soft-deleted — admission numbers must never be reused
      .getOne();

    let sequence = 1;
    if (lastStudent) {
      const parts = lastStudent.admissionNumber.split('/');
      const lastSeq = parseInt(parts[2] ?? '0', 10);
      sequence = isNaN(lastSeq) ? 1 : lastSeq + 1;
    }

    return `${prefix}${String(sequence).padStart(5, '0')}`;
  }

  /**
   * Generates a QR code PNG as a base64 data URL encoding the admission number.
   * The scanner at the security gate decodes the admission number to look up the student.
   */
  private async generateQrCode(admissionNumber: string): Promise<string> {
    return QRCode.toDataURL(admissionNumber, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
  }
}
