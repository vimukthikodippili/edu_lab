import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { MarkEntity, MarkStatus } from '../entities/mark.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import {
  StudentEntity,
  StudentStatus,
} from '../../students/entities/student.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { BulkUpsertMarksDto } from '../dto/bulk-upsert-marks.dto';
import { MarksSubmittedEvent } from '../events/marks-submitted.event';
import { MaterialsCheckService } from './materials-check.service';

export interface MarkRosterRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  markId: string | null;
  score: number | null;
  maxScore: number;
  status: MarkStatus | null;
}

@Injectable()
export class MarkService {
  constructor(
    @InjectRepository(MarkEntity)
    private readonly markRepo: Repository<MarkEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly materialsCheckService: MaterialsCheckService,
  ) {}

  private async assertAuthorized(
    assessment: AssessmentEntity,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    if (assessment.createdByTeacherId === teacherId) return;

    const requirement = await this.requirementRepo.findOne({
      where: {
        teacherId,
        subjectId: assessment.subjectId,
        classSectionId: assessment.classSectionId,
      },
    });
    if (!requirement) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject for this class section.',
      );
    }
  }

  async findForAssessment(
    assessmentId: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<{ assessment: AssessmentEntity; roster: MarkRosterRow[] }> {
    const assessment = await this.assessmentRepo.findOne({
      where: { id: assessmentId },
    });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }
    await this.assertAuthorized(assessment, teacherId, isPrivileged);

    const students = await this.studentRepo.find({
      where: {
        classSectionId: assessment.classSectionId,
        status: StudentStatus.ACTIVE,
      },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });

    const marks = await this.markRepo.findBy({ assessmentId });
    const markMap = new Map(marks.map((m) => [m.studentId, m]));

    const roster: MarkRosterRow[] = students.map((s) => {
      const mark = markMap.get(s.id);
      return {
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        admissionNumber: s.admissionNumber,
        markId: mark?.id ?? null,
        score: mark?.score != null ? Number(mark.score) : null,
        maxScore: assessment.totalMarks,
        status: mark?.status ?? null,
      };
    });

    return { assessment, roster };
  }

  async bulkUpsert(
    dto: BulkUpsertMarksDto,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<MarkEntity[]> {
    const assessment = await this.assessmentRepo.findOne({
      where: { id: dto.assessmentId },
    });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${dto.assessmentId} not found.`);
    }
    await this.assertAuthorized(assessment, teacherId, isPrivileged);

    // Materials-Readiness Gate — mirrors the Timetable-First Gate in lesson-plan.service.ts:
    // an assessment opted into this check cannot have marks submitted until every student in
    // the class section has been confirmed as materials-ready. Assessments that don't require
    // the check (the overwhelming majority — this defaults to false) are completely unaffected.
    if (assessment.requiresMaterialsCheck && dto.status === MarkStatus.SUBMITTED) {
      const status = await this.materialsCheckService.getStatus(assessment.id);
      if (!status.allConfirmed) {
        const unconfirmed = status.totalStudents - status.confirmedCount;
        throw new UnprocessableEntityException(
          `Materials readiness has not been confirmed for ${unconfirmed} of ${status.totalStudents} student(s). ` +
            `Complete the materials check before submitting marks for this assessment.`,
        );
      }
    }

    const violations = dto.entries
      .filter((e) => e.score > assessment.totalMarks)
      .map((e) => ({
        studentId: e.studentId,
        score: e.score,
        maxScore: assessment.totalMarks,
      }));

    if (violations.length > 0) {
      throw new UnprocessableEntityException({
        message: `${violations.length} entr${
          violations.length === 1 ? 'y exceeds' : 'ies exceed'
        } the maximum marks of ${assessment.totalMarks}.`,
        violations,
      });
    }

    const existing = await this.markRepo.findBy({
      assessmentId: dto.assessmentId,
    });
    const existingMap = new Map(existing.map((m) => [m.studentId, m]));

    if (!isPrivileged) {
      const lockedTargets = dto.entries.filter(
        (e) => existingMap.get(e.studentId)?.status === MarkStatus.SUBMITTED,
      );
      if (lockedTargets.length > 0) {
        throw new ForbiddenException(
          `Marks already submitted for ${lockedTargets.length} student(s) and are locked. Ask a Section Head to reopen them.`,
        );
      }
    }

    const toSave = dto.entries.map((entry) => {
      const record =
        existingMap.get(entry.studentId) ??
        this.markRepo.create({
          studentId: entry.studentId,
          assessmentId: dto.assessmentId,
        });

      record.score = String(entry.score);
      record.maxScore = assessment.totalMarks;
      record.status = dto.status;
      record.enteredByTeacherId = teacherId;
      return record;
    });

    const saved = await this.markRepo.save(toSave);

    if (dto.status === MarkStatus.SUBMITTED) {
      this.eventEmitter.emit(
        'marks.submitted',
        new MarksSubmittedEvent(
          assessment.id,
          assessment.subjectId,
          assessment.termId,
          assessment.classSectionId,
          dto.entries.map((e) => e.studentId),
        ),
      );
    }

    return saved;
  }
}
