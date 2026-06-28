import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Like, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { StudentEntity, StudentStatus } from './entities/student.entity';
import { GuardianEntity } from './entities/guardian.entity';
import { GradeEntity } from './entities/grade.entity';
import { ClassSectionEntity } from './entities/class-section.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';

export interface PaginatedStudents {
  data: StudentEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepository: Repository<StudentEntity>,

    @InjectRepository(GuardianEntity)
    private readonly guardianRepository: Repository<GuardianEntity>,

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
    // 1. Validate grade exists
    const grade = await this.gradeRepository.findOne({ where: { id: dto.gradeId } });
    if (!grade) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { gradeId: `Grade with id ${dto.gradeId} does not exist.` },
      });
    }

    // 2. Validate class section exists and belongs to the grade
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

    // 4. Guardian minimum check is already enforced by @ArrayMinSize(1) in DTO,
    //    but we defensively check here too so the service remains correct if
    //    called programmatically without the validation pipe.
    if (!dto.guardians || dto.guardians.length === 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { guardians: 'At least one guardian must be linked before enrollment is complete.' },
      });
    }

    // 5. Auto-generate unique admission number and QR code inside a transaction
    return this.dataSource.transaction(async (manager) => {
      const admissionNumber = await this.generateAdmissionNumber(manager.getRepository(StudentEntity));
      const qrCode = await this.generateQrCode(admissionNumber);

      // Persist guardians first
      const guardians: GuardianEntity[] = await Promise.all(
        dto.guardians.map((g) =>
          manager.save(GuardianEntity, manager.create(GuardianEntity, {
            firstName: g.firstName,
            lastName: g.lastName,
            relationship: g.relationship,
            nic: g.nic,
            phone: g.phone,
            email: g.email ?? null,
            address: g.address ?? null,
          })),
        ),
      );

      // Persist student
      const student = manager.create(StudentEntity, {
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
        guardians,
      });

      return manager.save(StudentEntity, student);
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
      .leftJoinAndSelect('student.guardians', 'guardians')
      .leftJoinAndSelect('student.photo', 'photo')
      .where('student.deletedAt IS NULL');

    if (query.search) {
      qb.andWhere(
        '(student.firstName ILIKE :search OR student.lastName ILIKE :search OR student.admissionNumber ILIKE :search OR guardians.phone ILIKE :search)',
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
      relations: ['grade', 'classSection', 'guardians', 'photo'],
    });
    if (!student) {
      throw new NotFoundException(`Student with id ${id} not found.`);
    }
    return student;
  }

  async findByAdmissionNumber(admissionNumber: string): Promise<StudentEntity> {
    const student = await this.studentRepository.findOne({
      where: { admissionNumber },
      relations: ['grade', 'classSection', 'guardians', 'photo'],
    });
    if (!student) {
      throw new NotFoundException(`Student with admission number ${admissionNumber} not found.`);
    }
    return student;
  }

  async findAllGrades(): Promise<GradeEntity[]> {
    return this.gradeRepository.find({ order: { level: 'ASC' } });
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
   * Generates the next sequential admission number for the current academic year.
   * Format: SIMS/YYYY/NNNNN (e.g. SIMS/2026/00001)
   *
   * Called inside a transaction — receives the transactional repository to
   * ensure the sequence read and the subsequent INSERT are atomic.
   * Using SELECT ... FOR UPDATE via raw query would be ideal on high-traffic
   * systems; for this school context a single-transaction approach is sufficient.
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
