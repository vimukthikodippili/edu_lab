import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentTopicAllocationEntity } from './entities/assignment-topic-allocation.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubjectTopicsService } from '../subject-topics/subject-topics.service';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    @InjectRepository(AssignmentTopicAllocationEntity)
    private readonly allocationRepo: Repository<AssignmentTopicAllocationEntity>,

    private readonly subjectTopicsService: SubjectTopicsService,
    private readonly dataSource: DataSource,
  ) {}

  private async assertAuthorized(
    subjectId: string,
    classSectionId: number,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;

    const requirement = await this.requirementRepo.findOne({
      where: { teacherId, subjectId, classSectionId },
    });
    if (!requirement) {
      throw new ForbiddenException(
        'You are not assigned to teach this subject for this class section.',
      );
    }
  }

  private async attachFiles(assignments: AssignmentEntity[]): Promise<void> {
    const allIds = [...new Set(assignments.flatMap((a) => a.attachmentFileIds ?? []))];
    if (!allIds.length) {
      assignments.forEach((a) => (a.attachments = []));
      return;
    }
    const files = await this.fileRepo.findByIds(allIds);
    const fileById = new Map(files.map((f) => [f.id, { id: f.id, path: f.path }]));
    assignments.forEach((a) => {
      a.attachments = (a.attachmentFileIds ?? [])
        .map((id) => fileById.get(id))
        .filter((f): f is { id: string; path: string } => !!f);
    });
  }

  private async attachTopicAllocations(assignments: AssignmentEntity[]): Promise<void> {
    if (assignments.length === 0) return;
    const allocations = await this.allocationRepo.find({
      where: { assignmentId: In(assignments.map((a) => a.id)) },
    });
    const byAssignmentId = new Map<string, AssignmentTopicAllocationEntity[]>();
    for (const allocation of allocations) {
      const list = byAssignmentId.get(allocation.assignmentId) ?? [];
      list.push(allocation);
      byAssignmentId.set(allocation.assignmentId, list);
    }
    assignments.forEach((a) => {
      a.topicAllocations = byAssignmentId.get(a.id) ?? [];
    });
  }

  /** Validates the allocation list against the subject's own topics and computes the total —
   * shared by create() so a manual total can never be supplied independently of these rules. */
  private async validateAndResolveAllocations(
    subjectId: string,
    topicAllocations: CreateAssignmentDto['topicAllocations'],
  ): Promise<{ totalMarks: number; topics: Map<string, Awaited<ReturnType<SubjectTopicsService['findById']>>> }> {
    // @ArrayMinSize(1) already enforces this at the HTTP boundary — re-checked here so a
    // direct service caller can never bypass it and save a zero-mark assignment.
    if (topicAllocations.length === 0) {
      throw new UnprocessableEntityException(
        'At least one topic allocation is required.',
      );
    }

    const topicIds = topicAllocations.map((a) => a.subjectTopicId);
    if (new Set(topicIds).size !== topicIds.length) {
      throw new UnprocessableEntityException('Duplicate topic in the allocation list.');
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
          `Topic "${topic.title}" is archived and cannot be used for a new assignment.`,
        );
      }
      topics.set(topic.id, topic);
    }

    const totalMarks = topicAllocations.reduce((sum, a) => sum + a.maxMarks, 0);
    return { totalMarks, topics };
  }

  async create(
    dto: CreateAssignmentDto,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<AssignmentEntity> {
    await this.assertAuthorized(dto.subjectId, dto.classSectionId, teacherId, isPrivileged);

    if (dto.attachmentFileIds?.length) {
      const files = await this.fileRepo.findByIds(dto.attachmentFileIds);
      if (files.length !== dto.attachmentFileIds.length) {
        const foundIds = new Set(files.map((f) => f.id));
        const missing = dto.attachmentFileIds.filter((id) => !foundIds.has(id));
        throw new UnprocessableEntityException({
          status: 422,
          errors: { attachmentFileIds: `Attachment(s) not found: ${missing.join(', ')}` },
        });
      }
    }

    const { totalMarks, topics } = await this.validateAndResolveAllocations(
      dto.subjectId,
      dto.topicAllocations,
    );

    const saved = await this.dataSource.transaction(async (manager) => {
      const assignmentRepo = manager.getRepository(AssignmentEntity);
      const allocationRepo = manager.getRepository(AssignmentTopicAllocationEntity);

      const assignment = await assignmentRepo.save(
        assignmentRepo.create({
          classSectionId: dto.classSectionId,
          subjectId: dto.subjectId,
          title: dto.title,
          instructions: dto.instructions,
          dueDate: dto.dueDate,
          attachmentFileIds: dto.attachmentFileIds ?? [],
          totalMarks,
          createdByTeacherId: teacherId,
        }),
      );

      const allocations = await allocationRepo.save(
        dto.topicAllocations.map((a) =>
          allocationRepo.create({
            assignmentId: assignment.id,
            subjectTopicId: a.subjectTopicId,
            maxMarks: a.maxMarks,
          }),
        ),
      );
      allocations.forEach((a) => {
        a.subjectTopic = topics.get(a.subjectTopicId)!;
      });

      assignment.topicAllocations = allocations;
      return assignment;
    });

    await this.attachFiles([saved]);
    return saved;
  }

  /** Student-visible list — the caller MUST already have resolved classSectionId from their
   * own JWT-linked StudentEntity; this method never receives a client-supplied value directly. */
  async findForClassSection(classSectionId: number): Promise<AssignmentEntity[]> {
    const assignments = await this.assignmentRepo.find({
      where: { classSectionId },
      order: { dueDate: 'ASC' },
    });
    await this.attachFiles(assignments);
    await this.attachTopicAllocations(assignments);
    return assignments;
  }

  async findMine(teacherId: string): Promise<AssignmentEntity[]> {
    const assignments = await this.assignmentRepo.find({
      where: { createdByTeacherId: teacherId },
      order: { dueDate: 'DESC' },
    });
    await this.attachFiles(assignments);
    await this.attachTopicAllocations(assignments);
    return assignments;
  }
}
