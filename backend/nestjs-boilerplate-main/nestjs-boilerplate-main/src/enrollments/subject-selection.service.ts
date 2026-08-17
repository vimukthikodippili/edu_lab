import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StudentEntity } from '../students/entities/student.entity';
import { GradeStageService } from '../students/grade-stage.service';
import { ALStreamEntity } from './entities/al-stream.entity';
import { ALStreamSubjectEntity } from './entities/al-stream-subject.entity';
import {
  SubjectSelectionWindowCoreSubjectEntity,
  SubjectSelectionWindowOptionalSubjectEntity,
} from './entities/subject-selection-window-subject.entity';
import {
  SubjectSelectionRequestEntity,
  SubjectSelectionStatus,
} from './entities/subject-selection-request.entity';
import {
  SubjectSelectionRequestItemEntity,
  SubjectSelectionType,
} from './entities/subject-selection-request-item.entity';
import { CareerAssessmentEntity } from '../career/entities/career-assessment.entity';
import { SubjectSelectionWindowService } from './subject-selection-window.service';
import { SubmitSubjectSelectionDto } from './dto/submit-subject-selection.dto';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';
import { SubjectSelectionApprovedEvent } from './events/subject-selection-approved.event';

export interface AvailableSubjectsResponse {
  window: SubjectSelectionWindowEntityLike | null;
  coreSubjects: unknown[];
  optionalSubjects: unknown[];
  streams: { id: number; name: string; description: string | null; subjects: unknown[] }[];
  existingRequest: {
    id: string;
    status: SubjectSelectionStatus;
    streamId: number | null;
    optionalSubjectIds: string[];
    reviewNote: string | null;
    submittedAt: Date;
  } | null;
  careerAdvisory: { dimension: string; label: string; description: string } | null;
}

interface SubjectSelectionWindowEntityLike {
  id: string;
  academicYear: string;
  openDate: Date;
  closeDate: Date;
  minOptionalSubjects: number;
  maxOptionalSubjects: number;
  requiresStreamSelection: boolean;
}

export interface PendingSubjectSelectionRequest {
  id: string;
  studentId: string;
  student: StudentEntity;
  windowId: string;
  window: SubjectSelectionWindowEntityLike;
  streamId: number | null;
  stream: ALStreamEntity | null;
  status: SubjectSelectionStatus;
  submittedAt: Date;
  items: SubjectSelectionRequestItemEntity[];
}

@Injectable()
export class SubjectSelectionService {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,
    @InjectRepository(ALStreamEntity)
    private readonly streamRepo: Repository<ALStreamEntity>,
    @InjectRepository(ALStreamSubjectEntity)
    private readonly streamSubjectRepo: Repository<ALStreamSubjectEntity>,
    @InjectRepository(SubjectSelectionWindowCoreSubjectEntity)
    private readonly coreSubjectRepo: Repository<SubjectSelectionWindowCoreSubjectEntity>,
    @InjectRepository(SubjectSelectionWindowOptionalSubjectEntity)
    private readonly optionalSubjectRepo: Repository<SubjectSelectionWindowOptionalSubjectEntity>,
    @InjectRepository(SubjectSelectionRequestEntity)
    private readonly requestRepo: Repository<SubjectSelectionRequestEntity>,
    @InjectRepository(SubjectSelectionRequestItemEntity)
    private readonly itemRepo: Repository<SubjectSelectionRequestItemEntity>,
    @InjectRepository(CareerAssessmentEntity)
    private readonly careerAssessmentRepo: Repository<CareerAssessmentEntity>,
    private readonly windowService: SubjectSelectionWindowService,
    private readonly gradeStageService: GradeStageService,
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  private async requireStudent(studentId: string): Promise<StudentEntity> {
    const student = await this.studentRepo.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException(`Student '${studentId}' not found.`);
    return student;
  }

  async getAvailableSubjects(studentId: string): Promise<AvailableSubjectsResponse> {
    const student = await this.requireStudent(studentId);

    // careerAdvisory is looked up purely for display and is never referenced by anything below
    // that decides which subjects appear — there is structurally no filter parameter for it to
    // plug into. This is what satisfies "RIASEC results must never restrict subject choices."
    const careerAdvisory = await this.buildCareerAdvisory(student.userId);

    const stage = await this.gradeStageService.resolveStageForLevel(student.grade.level);
    if (!stage) {
      return {
        window: null,
        coreSubjects: [],
        optionalSubjects: [],
        streams: [],
        existingRequest: null,
        careerAdvisory,
      };
    }

    const window = await this.windowService.findActiveWindowForGradeStage(stage.id);
    if (!window) {
      return {
        window: null,
        coreSubjects: [],
        optionalSubjects: [],
        streams: [],
        existingRequest: null,
        careerAdvisory,
      };
    }

    const [coreRows, optionalRows] = await Promise.all([
      this.coreSubjectRepo.find({ where: { windowId: window.id } }),
      this.optionalSubjectRepo.find({ where: { windowId: window.id } }),
    ]);

    let streams: { id: number; name: string; description: string | null; subjects: unknown[] }[] = [];
    if (window.requiresStreamSelection) {
      const activeStreams = await this.streamRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
      streams = await Promise.all(
        activeStreams.map(async (s) => {
          const subjectRows = await this.streamSubjectRepo.find({ where: { streamId: s.id } });
          return {
            id: s.id,
            name: s.name,
            description: s.description,
            subjects: subjectRows.map((r) => r.subject),
          };
        }),
      );
    }

    const lastRequest = await this.requestRepo.findOne({
      where: { studentId, windowId: window.id },
      order: { submittedAt: 'DESC' },
    });
    let existingRequest: AvailableSubjectsResponse['existingRequest'] = null;
    if (lastRequest && lastRequest.status !== SubjectSelectionStatus.REJECTED) {
      const items = await this.itemRepo.find({ where: { requestId: lastRequest.id } });
      existingRequest = {
        id: lastRequest.id,
        status: lastRequest.status,
        streamId: lastRequest.streamId,
        optionalSubjectIds: items
          .filter((i) => i.selectionType === SubjectSelectionType.OPTIONAL)
          .map((i) => i.subjectId),
        reviewNote: lastRequest.reviewNote,
        submittedAt: lastRequest.submittedAt,
      };
    } else if (lastRequest && lastRequest.status === SubjectSelectionStatus.REJECTED) {
      // A rejected request is surfaced (so the UI can show the reason) but does not block
      // resubmission — the form is still shown alongside it.
      existingRequest = {
        id: lastRequest.id,
        status: lastRequest.status,
        streamId: lastRequest.streamId,
        optionalSubjectIds: [],
        reviewNote: lastRequest.reviewNote,
        submittedAt: lastRequest.submittedAt,
      };
    }

    return {
      window: {
        id: window.id,
        academicYear: window.academicYear,
        openDate: window.openDate,
        closeDate: window.closeDate,
        minOptionalSubjects: window.minOptionalSubjects,
        maxOptionalSubjects: window.maxOptionalSubjects,
        requiresStreamSelection: window.requiresStreamSelection,
      },
      coreSubjects: coreRows.map((r) => r.subject),
      optionalSubjects: optionalRows.map((r) => r.subject),
      streams,
      existingRequest,
      careerAdvisory,
    };
  }

  async submitRequest(
    studentId: string,
    dto: SubmitSubjectSelectionDto,
  ): Promise<SubjectSelectionRequestEntity> {
    const student = await this.requireStudent(studentId);

    const stage = await this.gradeStageService.resolveStageForLevel(student.grade.level);
    if (!stage) {
      throw new BadRequestException('No grade stage is configured for this grade.');
    }

    const window = await this.windowService.findActiveWindowForGradeStage(stage.id);
    if (!window) {
      throw new BadRequestException('No subject selection window is currently open for your grade.');
    }

    const lastRequest = await this.requestRepo.findOne({
      where: { studentId, windowId: window.id },
      order: { submittedAt: 'DESC' },
    });
    // Only a REJECTED prior request allows resubmission — once PENDING or APPROVED, further
    // changes go through the Principal directly (existing admin/principal enrollment-edit
    // endpoints), not a second self-service submission for the same window.
    if (lastRequest && lastRequest.status !== SubjectSelectionStatus.REJECTED) {
      throw new ConflictException(
        lastRequest.status === SubjectSelectionStatus.PENDING
          ? 'You already have a pending subject selection request for this window.'
          : 'Your subject selection for this window has already been approved.',
      );
    }

    const optionalCount = dto.optionalSubjectIds.length;
    if (optionalCount < window.minOptionalSubjects || optionalCount > window.maxOptionalSubjects) {
      throw new BadRequestException(
        window.minOptionalSubjects === window.maxOptionalSubjects
          ? `You must choose exactly ${window.minOptionalSubjects} optional subject(s).`
          : `You must choose between ${window.minOptionalSubjects} and ${window.maxOptionalSubjects} optional subjects.`,
      );
    }

    const optionalPool = await this.optionalSubjectRepo.find({ where: { windowId: window.id } });
    const optionalPoolIds = new Set(optionalPool.map((r) => r.subjectId));
    for (const id of dto.optionalSubjectIds) {
      if (!optionalPoolIds.has(id)) {
        throw new BadRequestException(`Subject '${id}' is not in the optional pool for this window.`);
      }
    }

    let streamPackageSubjectIds: string[] = [];
    let streamId: number | null = null;
    if (window.requiresStreamSelection) {
      if (!dto.streamId) {
        throw new BadRequestException('A stream selection is required for this window.');
      }
      const stream = await this.streamRepo.findOne({ where: { id: dto.streamId } });
      if (!stream || !stream.isActive) {
        throw new BadRequestException('The selected stream does not exist or is inactive.');
      }
      streamId = stream.id;
      const packageRows = await this.streamSubjectRepo.find({ where: { streamId: stream.id } });
      streamPackageSubjectIds = packageRows.map((r) => r.subjectId);
    }

    const coreRows = await this.coreSubjectRepo.find({ where: { windowId: window.id } });
    const coreSubjectIds = coreRows.map((r) => r.subjectId);

    return this.dataSource.transaction(async (em) => {
      const request = await em.save(
        em.create(SubjectSelectionRequestEntity, {
          studentId,
          windowId: window.id,
          streamId,
          status: SubjectSelectionStatus.PENDING,
        }),
      );

      const items: Partial<SubjectSelectionRequestItemEntity>[] = [
        ...coreSubjectIds.map((subjectId) => ({
          requestId: request.id,
          subjectId,
          selectionType: SubjectSelectionType.CORE,
        })),
        ...streamPackageSubjectIds.map((subjectId) => ({
          requestId: request.id,
          subjectId,
          selectionType: SubjectSelectionType.STREAM_PACKAGE,
        })),
        ...dto.optionalSubjectIds.map((subjectId) => ({
          requestId: request.id,
          subjectId,
          selectionType: SubjectSelectionType.OPTIONAL,
        })),
      ];
      if (items.length > 0) {
        await em.save(SubjectSelectionRequestItemEntity, items.map((i) => em.create(SubjectSelectionRequestItemEntity, i)));
      }

      return request;
    });
  }

  async findPending(gradeStageId?: string): Promise<PendingSubjectSelectionRequest[]> {
    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.student', 'student')
      .leftJoinAndSelect('student.grade', 'grade')
      .leftJoinAndSelect('student.classSection', 'classSection')
      .leftJoinAndSelect('r.window', 'window')
      .leftJoinAndSelect('r.stream', 'stream')
      .where('r.status = :status', { status: SubjectSelectionStatus.PENDING })
      .orderBy('r.submittedAt', 'ASC');
    if (gradeStageId) {
      qb.andWhere('window.gradeStageId = :gradeStageId', { gradeStageId });
    }
    const requests = await qb.getMany();
    if (requests.length === 0) return [];

    const items = await this.itemRepo.find({ where: { requestId: In(requests.map((r) => r.id)) } });
    const itemsByRequestId = new Map<string, SubjectSelectionRequestItemEntity[]>();
    for (const item of items) {
      const list = itemsByRequestId.get(item.requestId) ?? [];
      list.push(item);
      itemsByRequestId.set(item.requestId, list);
    }

    return requests.map((r) => ({ ...r, items: itemsByRequestId.get(r.id) ?? [] }));
  }

  async decide(
    requestId: string,
    decision: SubjectSelectionStatus.APPROVED | SubjectSelectionStatus.REJECTED,
    decidedByStaffId: string,
    reviewNote?: string,
  ): Promise<SubjectSelectionRequestEntity> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`Subject selection request ${requestId} not found.`);
    if (request.status !== SubjectSelectionStatus.PENDING) {
      throw new BadRequestException(
        `This subject selection request has already been ${request.status}.`,
      );
    }
    if (decision === SubjectSelectionStatus.REJECTED && !reviewNote?.trim()) {
      throw new BadRequestException('A reason is required to reject a subject selection request.');
    }

    request.status = decision;
    request.reviewedById = decidedByStaffId;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote ?? null;
    await this.requestRepo.save(request);

    await this.auditService.log({
      actorId: decidedByStaffId,
      action: decision === SubjectSelectionStatus.APPROVED ? 'approve' : 'reject',
      targetType: 'subject_selection',
      targetId: requestId,
      reason: reviewNote,
    });

    const student = await this.studentRepo.findOne({
      where: { id: request.studentId },
      relations: ['studentGuardians', 'studentGuardians.guardian'],
    });

    let subjectIds: string[] = [];
    if (decision === SubjectSelectionStatus.APPROVED) {
      const items = await this.itemRepo.find({ where: { requestId } });
      subjectIds = items.map((i) => i.subjectId);

      await this.dataSource.transaction(async (em) => {
        if (request.streamId) {
          await em.query(`UPDATE "student" SET "streamId" = $1 WHERE "id" = $2`, [
            request.streamId,
            request.studentId,
          ]);
        }
        for (const item of items) {
          await em.query(
            `INSERT INTO "student_subject_enrollment"
               ("studentId", "subjectId", "selectionType", "selectedByStudent", "approvedAt")
             VALUES ($1, $2, $3, true, now())
             ON CONFLICT ("studentId", "subjectId") DO UPDATE SET
               "selectionType" = EXCLUDED."selectionType",
               "selectedByStudent" = true,
               "approvedAt" = now()`,
            [request.studentId, item.subjectId, item.selectionType],
          );
        }
      });

      this.eventEmitter.emit(
        'subjectSelection.approved',
        new SubjectSelectionApprovedEvent(requestId, request.studentId, request.windowId, subjectIds),
      );
    }

    const verb = decision === SubjectSelectionStatus.APPROVED ? 'approved' : 'rejected';
    const message =
      decision === SubjectSelectionStatus.APPROVED
        ? 'Your subject selection has been approved. Your subjects are now confirmed — see My Subjects for the full list.'
        : `Your subject selection has been rejected.${reviewNote ? ' Reason: ' + reviewNote : ''} You may submit a new selection while the window is still open.`;

    await this.notificationService.createForStudent(
      request.studentId,
      `Subject Selection ${decision === SubjectSelectionStatus.APPROVED ? 'Approved' : 'Rejected'}`,
      message,
      'subject_selection_decision',
    );
    if (student?.guardians?.length) {
      await Promise.all(
        student.guardians.map((g) =>
          this.notificationService.createForGuardian(
            g.id,
            `Subject Selection ${decision === SubjectSelectionStatus.APPROVED ? 'Approved' : 'Rejected'}`,
            `${student.firstName} ${student.lastName}'s subject selection has been ${verb}.${reviewNote ? ' Reason: ' + reviewNote : ''}`,
            'subject_selection_decision',
          ),
        ),
      );
    }

    return request;
  }

  private async buildCareerAdvisory(
    userId: number | null,
  ): Promise<AvailableSubjectsResponse['careerAdvisory']> {
    if (!userId) return null;
    const latest = await this.careerAssessmentRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const suggestion = latest?.riasecSuggestions?.[0];
    if (!suggestion) return null;
    return {
      dimension: suggestion.dimension,
      label: suggestion.label,
      description: suggestion.description,
    };
  }
}
