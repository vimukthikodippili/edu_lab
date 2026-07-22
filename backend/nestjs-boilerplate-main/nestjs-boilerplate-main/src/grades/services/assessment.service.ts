import {
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
import { SubjectTopicsService } from '../../subject-topics/subject-topics.service';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(TermAssessmentPlanEntity)
    private readonly planRepo: Repository<TermAssessmentPlanEntity>,
    @InjectRepository(AssessmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssessmentTopicAllocationEntity>,
    private readonly subjectTopicsService: SubjectTopicsService,
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

    return this.dataSource.transaction(async (manager) => {
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
    const where: Record<string, unknown> = {};
    if (termId) where.termId = termId;
    if (classSectionId) where.classSectionId = classSectionId;
    if (subjectId) where.subjectId = subjectId;
    if (createdByTeacherId) where.createdByTeacherId = createdByTeacherId;
    const assessments = await this.assessmentRepo.find({
      where,
      order: { scheduledDate: 'ASC' },
    });
    await this.attachTopicAllocations(assessments);
    return assessments;
  }

  async findById(id: string): Promise<AssessmentEntity> {
    const assessment = await this.assessmentRepo.findOne({ where: { id } });
    if (!assessment)
      throw new NotFoundException(`Assessment ${id} not found.`);
    await this.attachTopicAllocations([assessment]);
    return assessment;
  }
}
