import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AssessmentEntity } from '../entities/assessment.entity';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';
import { AssessmentTopicAllocationEntity } from '../entities/assessment-topic-allocation.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { RequestAssessmentChangeDto } from '../dto/request-assessment-change.dto';
import { SubjectTopicsService } from '../../subject-topics/subject-topics.service';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { StaffEntity } from '../../staff/entities/staff.entity';
import { SubjectEntity } from '../../subjects/entities/subject.entity';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(TermAssessmentPlanEntity)
    private readonly planRepo: Repository<TermAssessmentPlanEntity>,
    @InjectRepository(AssessmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssessmentTopicAllocationEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
    @InjectRepository(StaffEntity)
    private readonly staffRepo: Repository<StaffEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    private readonly subjectTopicsService: SubjectTopicsService,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  /** Validates the allocation list against the subject's own topics and computes the total —
   * shared by create() so a manual total can never be supplied independently of these rules. */
  private async validateAndResolveAllocations(
    subjectId: string,
    topicAllocations: CreateAssessmentDto['topicAllocations'],
  ): Promise<{ totalMarks: number; topics: Map<string, Awaited<ReturnType<SubjectTopicsService['findById']>>> }> {
    // @ArrayMinSize(1) already enforces this at the HTTP boundary — re-checked here so a
    // direct service caller can never bypass it and save a zero-mark assessment.
    if (topicAllocations.length === 0) {
      throw new UnprocessableEntityException(
        'At least one topic allocation is required.',
      );
    }

    const topicIds = topicAllocations.map((a) => a.subjectTopicId);
    if (new Set(topicIds).size !== topicIds.length) {
      throw new UnprocessableEntityException(
        'Duplicate topic in the allocation list.',
      );
    }

    const topics = new Map<string, Awaited<ReturnType<SubjectTopicsService['findById']>>>();
    for (const topicId of topicIds) {
      const topic = await this.subjectTopicsService.findById(topicId);
      if (topic.subjectId !== subjectId) {
        throw new UnprocessableEntityException(
          `Topic "${topic.title}" does not belong to this subject.`,
        );
      }
      if (topic.isArchived) {
        throw new UnprocessableEntityException(
          `Topic "${topic.title}" is archived and cannot be used for a new assessment.`,
        );
      }
      topics.set(topic.id, topic);
    }

    const totalMarks = topicAllocations.reduce((sum, a) => sum + a.maxMarks, 0);
    return { totalMarks, topics };
  }

  async create(
    dto: CreateAssessmentDto,
    createdByTeacherId: string,
  ): Promise<AssessmentEntity> {
    const plan = await this.planRepo.findOne({
      where: { subjectId: dto.subjectId, termId: dto.termId },
    });
    if (!plan) {
      throw new NotFoundException(
        'No assessment plan found for this subject and term. Ask your Section Head to configure one.',
      );
    }

    const existingCount = await this.assessmentRepo.count({
      where: {
        subjectId: dto.subjectId,
        termId: dto.termId,
        classSectionId: dto.classSectionId,
      },
    });

    if (
      existingCount >= plan.requiredAssessmentCount &&
      !dto.sectionHeadOverride
    ) {
      throw new UnprocessableEntityException(
        `Assessment limit reached (${plan.requiredAssessmentCount} required). A Section Head override is needed to add more.`,
      );
    }

    const { totalMarks, topics } = await this.validateAndResolveAllocations(
      dto.subjectId,
      dto.topicAllocations,
    );

    // Resolved up front so the notification step below has the target teacher ready. Deliberately
    // not a hard requirement — MarkService.assertAuthorized() treats the assessment's own creator
    // as always-authorized regardless of whether a Period Requirement row exists, so a teacher
    // creating their own assessment for a subject/class with no formal requirement row yet must
    // keep working exactly as before; only a genuine Section Head hand-off has anyone to notify.
    const requirement = await this.requirementRepo.findOne({
      where: { subjectId: dto.subjectId, classSectionId: dto.classSectionId },
    });

    const assessment = await this.dataSource.transaction(async (manager) => {
      const assessmentRepo = manager.getRepository(AssessmentEntity);
      const allocationRepo = manager.getRepository(AssessmentTopicAllocationEntity);

      const assessment = await assessmentRepo.save(
        assessmentRepo.create({
          subjectId: dto.subjectId,
          termId: dto.termId,
          classSectionId: dto.classSectionId,
          title: dto.title,
          assessmentType: dto.assessmentType,
          scheduledDate: new Date(
            dto.scheduledDate + 'T00:00:00Z',
          ) as unknown as Date,
          totalMarks,
          createdByTeacherId,
          sectionHeadOverride: dto.sectionHeadOverride ?? false,
          overrideApprovedById: dto.sectionHeadOverride ? createdByTeacherId : null,
          requiresMaterialsCheck: dto.requiresMaterialsCheck ?? false,
          instructions: dto.instructions ?? null,
        }),
      );

      const allocations = await allocationRepo.save(
        dto.topicAllocations.map((a) =>
          allocationRepo.create({
            assessmentId: assessment.id,
            subjectTopicId: a.subjectTopicId,
            maxMarks: a.maxMarks,
            questionType: a.questionType,
          }),
        ),
      );
      allocations.forEach((a) => {
        a.subjectTopic = topics.get(a.subjectTopicId)!;
      });

      assessment.topicAllocations = allocations;
      return assessment;
    });

    // A teacher creating their own assessment resolves to themselves here — no notification
    // needed. Only fires when someone else (a Section Head, scheduling on the teacher's
    // behalf) is the actual creator.
    if (requirement && requirement.teacherId !== createdByTeacherId) {
      const subject = await this.subjectRepo.findOne({ where: { id: dto.subjectId } });
      const topicSummary = dto.topicAllocations
        .map((a) => `${topics.get(a.subjectTopicId)!.title} (${a.maxMarks})`)
        .join(', ');
      await this.notificationService.createForStaff(
        requirement.teacherId,
        `${subject?.name ?? 'Subject'} ${assessment.assessmentType.replace(/_/g, ' ')} scheduled for ${dto.scheduledDate}`,
        `Topics and marks: ${topicSummary}. Total: ${totalMarks}. Please enter marks after the assessment.`,
        'assessment_scheduled',
      );
    }

    return assessment;
  }

  private async attachTopicAllocations(assessments: AssessmentEntity[]): Promise<void> {
    if (assessments.length === 0) return;
    const allocations = await this.allocationRepo.find({
      where: { assessmentId: In(assessments.map((a) => a.id)) },
    });
    const byAssessmentId = new Map<string, AssessmentTopicAllocationEntity[]>();
    for (const allocation of allocations) {
      const list = byAssessmentId.get(allocation.assessmentId) ?? [];
      list.push(allocation);
      byAssessmentId.set(allocation.assessmentId, list);
    }
    assessments.forEach((a) => {
      a.topicAllocations = byAssessmentId.get(a.id) ?? [];
    });
  }

  async findAll(
    termId?: number,
    classSectionId?: number,
    subjectId?: string,
    createdByTeacherId?: string,
  ): Promise<AssessmentEntity[]> {
    const baseFilters: Record<string, unknown> = {};
    if (termId) baseFilters.termId = termId;
    if (classSectionId) baseFilters.classSectionId = classSectionId;
    if (subjectId) baseFilters.subjectId = subjectId;

    if (!createdByTeacherId) {
      const assessments = await this.assessmentRepo.find({
        where: baseFilters,
        order: { scheduledDate: 'ASC' },
      });
      await this.attachTopicAllocations(assessments);
      return assessments;
    }

    // "mine" means created by me OR for a subject+class I'm formally assigned to teach — a
    // Section Head can create an assessment on a teacher's behalf, and that teacher must still
    // see it here (to enter marks) even though they didn't create it themselves.
    const assignments = await this.requirementRepo.find({
      where: { teacherId: createdByTeacherId },
    });
    const whereClauses: Record<string, unknown>[] = [
      { ...baseFilters, createdByTeacherId },
      ...assignments
        .filter(
          (a) =>
            (!subjectId || a.subjectId === subjectId) &&
            (!classSectionId || a.classSectionId === classSectionId),
        )
        .map((a) => ({ ...baseFilters, subjectId: a.subjectId, classSectionId: a.classSectionId })),
    ];

    const assessments = await this.assessmentRepo.find({
      where: whereClauses,
      order: { scheduledDate: 'ASC' },
    });
    const deduped = [...new Map(assessments.map((a) => [a.id, a])).values()];
    await this.attachTopicAllocations(deduped);
    return deduped;
  }

  async findById(id: string): Promise<AssessmentEntity> {
    const assessment = await this.assessmentRepo.findOne({ where: { id } });
    if (!assessment)
      throw new NotFoundException(`Assessment ${id} not found.`);
    await this.attachTopicAllocations([assessment]);
    return assessment;
  }

  /** Mirrors MarkService.assertAuthorized's exact rule: the assessment's own creator is always
   * authorized; otherwise the caller must be the teacher formally assigned to this subject+class. */
  private async assertAuthorized(
    assessment: AssessmentEntity,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    if (assessment.createdByTeacherId === staffId) return;

    const requirement = await this.requirementRepo.findOne({
      where: {
        teacherId: staffId,
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

  async requestChange(
    assessmentId: string,
    dto: RequestAssessmentChangeDto,
    staffId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }
    await this.assertAuthorized(assessment, staffId, isPrivileged);

    const requester = await this.staffRepo.findOne({ where: { id: staffId } });
    const requesterName = requester ? `${requester.firstName} ${requester.lastName}` : 'A teacher';

    await this.notificationService.createForStaff(
      assessment.createdByTeacherId,
      `Change requested: ${assessment.title}`,
      `${requesterName}: ${dto.message}`,
      'assessment_change_requested',
    );
  }
}
