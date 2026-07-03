import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubjectResultEntity } from '../entities/subject-result.entity';
import { TermResultEntity } from '../entities/term-result.entity';
import { StudentEntity } from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';

export interface ClassRankRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  totalScore: number;
  totalMaxScore: number;
  percentage: number | null;
  letterGrade: string | null;
  rank: number | null;
  isComplete: boolean;
  isPublished: boolean;
  reportCardPath: string | null;
}

@Injectable()
export class ResultsQueryService {
  constructor(
    @InjectRepository(SubjectResultEntity)
    private readonly subjectResultRepo: Repository<SubjectResultEntity>,
    @InjectRepository(TermResultEntity)
    private readonly termResultRepo: Repository<TermResultEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
  ) {}

  private async assertClassAccess(
    staffId: string,
    classSectionId: number,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    const count = await this.requirementRepo.count({
      where: { teacherId: staffId, classSectionId },
    });
    if (count === 0) {
      throw new ForbiddenException(
        'You do not teach any subject in this class section.',
      );
    }
  }

  private async assertSubjectAccess(
    staffId: string,
    subjectId: string,
    classSectionId: number,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    const count = await this.requirementRepo.count({
      where: { teacherId: staffId, subjectId, classSectionId },
    });
    if (count === 0) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject for this class section.',
      );
    }
  }

  async getSubjectResult(
    studentId: string,
    subjectId: string,
    termId: number,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<SubjectResultEntity> {
    const result = await this.subjectResultRepo.findOne({
      where: { studentId, subjectId, termId },
    });
    if (!result) {
      throw new NotFoundException('No subject result found.');
    }
    await this.assertSubjectAccess(
      staffId,
      subjectId,
      result.classSectionId,
      isPrivileged,
    );
    return result;
  }

  async getTermResult(
    studentId: string,
    termId: number,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<TermResultEntity> {
    const result = await this.termResultRepo.findOne({
      where: { studentId, termId },
      relations: ['reportCardFile'],
    });
    if (!result) {
      throw new NotFoundException('No term result found.');
    }
    await this.assertClassAccess(staffId, result.classSectionId, isPrivileged);
    return result;
  }

  async getClassResults(
    classSectionId: number,
    termId: number,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<ClassRankRow[]> {
    await this.assertClassAccess(staffId, classSectionId, isPrivileged);

    const results = await this.termResultRepo.find({
      where: { classSectionId, termId },
      relations: ['reportCardFile'],
    });
    const students = await this.studentRepo.find({
      where: { classSectionId },
    });
    const studentById = new Map(students.map((s) => [s.id, s]));

    const rows: ClassRankRow[] = results
      .filter((r) => studentById.has(r.studentId))
      .map((r) => {
        const student = studentById.get(r.studentId)!;
        return {
          studentId: r.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          totalScore: Number(r.totalScore),
          totalMaxScore: Number(r.totalMaxScore),
          percentage: r.percentage !== null ? Number(r.percentage) : null,
          letterGrade: r.letterGrade ?? null,
          rank: r.rank,
          isComplete: r.isComplete,
          isPublished: r.isPublished,
          reportCardPath: r.reportCardFile?.path ?? null,
        };
      });

    rows.sort((a, b) => {
      if (a.rank === null && b.rank === null) return b.totalScore - a.totalScore;
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.totalScore - a.totalScore;
    });

    return rows;
  }
}
