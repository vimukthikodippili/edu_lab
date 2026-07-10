import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentYearEndNoteEntity } from './entities/student-year-end-note.entity';
import { StudentEntity } from '../students/entities/student.entity';
import { UpsertStudentYearEndNoteDto } from './dto/upsert-student-year-end-note.dto';

@Injectable()
export class StudentNotesService {
  constructor(
    @InjectRepository(StudentYearEndNoteEntity)
    private readonly noteRepo: Repository<StudentYearEndNoteEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
  ) {}

  /**
   * requesterStaffId === null means the caller is admin/principal (privileged, no ownership check).
   * Otherwise the caller must be the student's current class teacher.
   */
  async getNotesForStudent(
    studentId: string,
    requesterStaffId: string | null,
  ): Promise<StudentYearEndNoteEntity[]> {
    if (requesterStaffId !== null) {
      await this.assertIsClassTeacher(studentId, requesterStaffId);
    } else {
      const student = await this.studentRepo.findOne({ where: { id: studentId } });
      if (!student) {
        throw new NotFoundException(`Student with id ${studentId} not found.`);
      }
    }

    return this.noteRepo.find({
      where: { studentId },
      order: { academicYear: 'DESC' },
    });
  }

  async upsertNote(
    studentId: string,
    callerStaffId: string,
    dto: UpsertStudentYearEndNoteDto,
  ): Promise<StudentYearEndNoteEntity> {
    await this.assertIsClassTeacher(studentId, callerStaffId);

    const existing = await this.noteRepo.findOne({
      where: { studentId, academicYear: dto.academicYear },
    });

    if (existing) {
      existing.position = dto.position ?? null;
      existing.extracurricularActivities = dto.extracurricularActivities ?? null;
      existing.generalRemarks = dto.generalRemarks ?? null;
      return this.noteRepo.save(existing);
    }

    return this.noteRepo.save(
      this.noteRepo.create({
        studentId,
        academicYear: dto.academicYear,
        classTeacherStaffId: callerStaffId,
        position: dto.position ?? null,
        extracurricularActivities: dto.extracurricularActivities ?? null,
        generalRemarks: dto.generalRemarks ?? null,
      }),
    );
  }

  private async assertIsClassTeacher(
    studentId: string,
    staffId: string,
  ): Promise<StudentEntity> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student with id ${studentId} not found.`);
    }
    if (student.classSection.classTeacherStaffId !== staffId) {
      throw new ForbiddenException(
        'Only the current class teacher of this student may access year-end notes.',
      );
    }
    return student;
  }
}
