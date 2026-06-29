import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ALStreamEntity } from './entities/al-stream.entity';
import { ALStreamSubjectEntity } from './entities/al-stream-subject.entity';
import { StudentSubjectEnrollmentEntity } from './entities/student-subject-enrollment.entity';
import { SubjectEntity } from '../subjects/entities/subject.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { ReplaceEnrollmentsDto } from './dto/replace-enrollments.dto';
import { AssignStreamDto } from './dto/assign-stream.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(ALStreamEntity)
    private readonly streamRepo: Repository<ALStreamEntity>,
    @InjectRepository(ALStreamSubjectEntity)
    private readonly streamSubjectRepo: Repository<ALStreamSubjectEntity>,
    @InjectRepository(StudentSubjectEnrollmentEntity)
    private readonly enrollmentRepo: Repository<StudentSubjectEnrollmentEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────── A/L Stream Management ────────────────────────────

  async createStream(dto: CreateStreamDto): Promise<ALStreamEntity> {
    const duplicate = await this.streamRepo
      .createQueryBuilder('s')
      .where('LOWER(s.name) = LOWER(:name)', { name: dto.name.trim() })
      .getOne();
    if (duplicate) {
      throw new ConflictException(`Stream '${dto.name}' already exists`);
    }
    const stream = this.streamRepo.create({ name: dto.name.trim(), description: dto.description ?? null });
    return this.streamRepo.save(stream);
  }

  async findAllStreams(includeInactive = false): Promise<ALStreamEntity[]> {
    const qb = this.streamRepo.createQueryBuilder('s').orderBy('s.name', 'ASC');
    if (!includeInactive) {
      qb.where('s.isActive = true');
    }
    return qb.getMany();
  }

  async findStreamById(id: number): Promise<ALStreamEntity> {
    const stream = await this.streamRepo.findOne({ where: { id } });
    if (!stream) throw new NotFoundException(`Stream #${id} not found`);
    return stream;
  }

  async updateStream(id: number, dto: UpdateStreamDto): Promise<ALStreamEntity> {
    const stream = await this.findStreamById(id);
    if (dto.name && dto.name.trim().toLowerCase() !== stream.name.toLowerCase()) {
      const dup = await this.streamRepo
        .createQueryBuilder('s')
        .where('LOWER(s.name) = LOWER(:name)', { name: dto.name.trim() })
        .andWhere('s.id != :id', { id })
        .getOne();
      if (dup) throw new ConflictException(`Stream '${dto.name}' already exists`);
    }
    if (dto.name !== undefined) stream.name = dto.name.trim();
    if (dto.description !== undefined) stream.description = dto.description ?? null;
    return this.streamRepo.save(stream);
  }

  async deactivateStream(id: number): Promise<ALStreamEntity> {
    const stream = await this.findStreamById(id);
    stream.isActive = false;
    return this.streamRepo.save(stream);
  }

  async reactivateStream(id: number): Promise<ALStreamEntity> {
    const stream = await this.findStreamById(id);
    stream.isActive = true;
    return this.streamRepo.save(stream);
  }

  // ─────────────────────── Stream Default Subjects ──────────────────────────

  async getStreamSubjects(streamId: number): Promise<ALStreamSubjectEntity[]> {
    await this.findStreamById(streamId);
    return this.streamSubjectRepo.find({
      where: { streamId },
      relations: ['subject', 'subject.category'],
    });
  }

  async addSubjectToStream(streamId: number, subjectId: string): Promise<ALStreamSubjectEntity> {
    await this.findStreamById(streamId);
    const subject = await this.subjectRepo.findOne({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException(`Subject '${subjectId}' not found`);

    const existing = await this.streamSubjectRepo.findOne({ where: { streamId, subjectId } });
    if (existing) throw new ConflictException(`Subject '${subjectId}' is already in stream #${streamId}`);

    const row = this.streamSubjectRepo.create({ streamId, subjectId });
    return this.streamSubjectRepo.save(row);
  }

  async removeSubjectFromStream(streamId: number, subjectId: string): Promise<void> {
    const row = await this.streamSubjectRepo.findOne({ where: { streamId, subjectId } });
    if (!row) throw new NotFoundException(`Subject '${subjectId}' is not in stream #${streamId}`);
    await this.streamSubjectRepo.remove(row);
  }

  // ─────────────────────── Per-Student Enrollment ───────────────────────────

  async findStudentEnrollments(studentId: string): Promise<StudentSubjectEnrollmentEntity[]> {
    await this.requireStudent(studentId);
    return this.enrollmentRepo.find({
      where: { studentId },
      relations: ['subject', 'subject.category'],
      order: { enrolledAt: 'ASC' },
    });
  }

  async addEnrollment(studentId: string, subjectId: string): Promise<StudentSubjectEnrollmentEntity> {
    await this.requireStudent(studentId);
    const subject = await this.subjectRepo.findOne({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException(`Subject '${subjectId}' not found`);
    if (!subject.isActive) {
      throw new UnprocessableEntityException(`Subject '${subjectId}' is not active`);
    }

    const dup = await this.enrollmentRepo.findOne({ where: { studentId, subjectId } });
    if (dup) throw new ConflictException(`Student already enrolled in subject '${subjectId}'`);

    const row = this.enrollmentRepo.create({ studentId, subjectId });
    return this.enrollmentRepo.save(row);
  }

  async removeEnrollment(studentId: string, subjectId: string): Promise<void> {
    const row = await this.enrollmentRepo.findOne({ where: { studentId, subjectId } });
    if (!row) throw new NotFoundException(`Enrollment for subject '${subjectId}' not found`);
    await this.enrollmentRepo.remove(row);
  }

  async replaceEnrollments(
    studentId: string,
    dto: ReplaceEnrollmentsDto,
  ): Promise<StudentSubjectEnrollmentEntity[]> {
    await this.requireStudent(studentId);

    // Validate each subjectId before touching the DB
    for (const sid of dto.subjectIds) {
      const subject = await this.subjectRepo.findOne({ where: { id: sid } });
      if (!subject || !subject.isActive) {
        throw new UnprocessableEntityException(`Subject '${sid}' does not exist or is inactive`);
      }
    }

    await this.dataSource.transaction(async (em) => {
      // Scoped DELETE — structurally can only affect this student (AC-3)
      await em
        .createQueryBuilder()
        .delete()
        .from(StudentSubjectEnrollmentEntity)
        .where('"studentId" = :studentId', { studentId })
        .execute();

      if (dto.subjectIds.length > 0) {
        const rows = dto.subjectIds.map((sid) =>
          em.create(StudentSubjectEnrollmentEntity, { studentId, subjectId: sid }),
        );
        await em.save(StudentSubjectEnrollmentEntity, rows);
      }
    });

    return this.findStudentEnrollments(studentId);
  }

  async assignStream(
    studentId: string,
    dto: AssignStreamDto,
  ): Promise<StudentSubjectEnrollmentEntity[]> {
    const student = await this.requireStudent(studentId);

    if (dto.streamId !== null && dto.streamId !== undefined) {
      const stream = await this.streamRepo.findOne({ where: { id: dto.streamId } });
      if (!stream) throw new NotFoundException(`Stream #${dto.streamId} not found`);
      if (!stream.isActive) {
        throw new UnprocessableEntityException(`Cannot assign inactive stream`);
      }

      if (student.grade?.stage !== 'collegiate') {
        throw new UnprocessableEntityException(
          'Stream assignment is only valid for Grade 12–13 (A/L) students',
        );
      }

      await this.dataSource.transaction(async (em) => {
        await em.query(
          `UPDATE "student" SET "streamId" = $1 WHERE "id" = $2`,
          [dto.streamId, studentId],
        );
        // Pre-populate stream defaults; ON CONFLICT DO NOTHING preserves custom enrollments
        await em.query(
          `INSERT INTO "student_subject_enrollment" ("studentId", "subjectId")
           SELECT $1, "subjectId" FROM "al_stream_subject" WHERE "streamId" = $2
           ON CONFLICT DO NOTHING`,
          [studentId, dto.streamId],
        );
      });
    } else {
      // null → clear stream assignment but leave enrollment rows intact
      await this.studentRepo.query(
        `UPDATE "student" SET "streamId" = NULL WHERE "id" = $1`,
        [studentId],
      );
    }

    return this.findStudentEnrollments(studentId);
  }

  async removeStream(studentId: string): Promise<void> {
    await this.requireStudent(studentId);
    // Deliberately does NOT delete enrollment rows — student keeps their subjects
    await this.studentRepo.query(
      `UPDATE "student" SET "streamId" = NULL WHERE "id" = $1`,
      [studentId],
    );
  }

  // ─────────────────────── Helpers ──────────────────────────────────────────

  private async requireStudent(studentId: string): Promise<StudentEntity> {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ['grade'],
    });
    if (!student) throw new NotFoundException(`Student '${studentId}' not found`);
    return student;
  }
}
