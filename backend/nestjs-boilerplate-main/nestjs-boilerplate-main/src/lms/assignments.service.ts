import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentEntity } from './entities/assignment.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
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

    const assignment = this.assignmentRepo.create({
      classSectionId: dto.classSectionId,
      subjectId: dto.subjectId,
      title: dto.title,
      instructions: dto.instructions,
      dueDate: dto.dueDate,
      attachmentFileIds: dto.attachmentFileIds ?? [],
      createdByTeacherId: teacherId,
    });

    const saved = await this.assignmentRepo.save(assignment);
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
    return assignments;
  }

  async findMine(teacherId: string): Promise<AssignmentEntity[]> {
    const assignments = await this.assignmentRepo.find({
      where: { createdByTeacherId: teacherId },
      order: { dueDate: 'DESC' },
    });
    await this.attachFiles(assignments);
    return assignments;
  }
}
