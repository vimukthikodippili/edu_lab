import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentEntity } from '../entities/assessment.entity';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(TermAssessmentPlanEntity)
    private readonly planRepo: Repository<TermAssessmentPlanEntity>,
  ) {}

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

    const assessment = this.assessmentRepo.create({
      subjectId: dto.subjectId,
      termId: dto.termId,
      classSectionId: dto.classSectionId,
      title: dto.title,
      assessmentType: dto.assessmentType,
      scheduledDate: new Date(
        dto.scheduledDate + 'T00:00:00Z',
      ) as unknown as Date,
      totalMarks: dto.totalMarks,
      createdByTeacherId,
      sectionHeadOverride: dto.sectionHeadOverride ?? false,
      overrideApprovedById: dto.sectionHeadOverride ? createdByTeacherId : null,
    });

    return this.assessmentRepo.save(assessment);
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
    return this.assessmentRepo.find({
      where,
      order: { scheduledDate: 'ASC' },
    });
  }

  async findById(id: string): Promise<AssessmentEntity> {
    const assessment = await this.assessmentRepo.findOne({ where: { id } });
    if (!assessment)
      throw new NotFoundException(`Assessment ${id} not found.`);
    return assessment;
  }
}
