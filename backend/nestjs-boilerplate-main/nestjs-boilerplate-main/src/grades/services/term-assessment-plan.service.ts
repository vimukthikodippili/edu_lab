import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermAssessmentPlanEntity } from '../entities/term-assessment-plan.entity';
import { AssessmentEntity } from '../entities/assessment.entity';
import { TeacherSubjectClassRequirementEntity } from '../../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { CreateTermAssessmentPlanDto } from '../dto/create-term-assessment-plan.dto';
import { UpdateTermAssessmentPlanDto } from '../dto/update-term-assessment-plan.dto';

export interface SubjectPlanSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  plan: TermAssessmentPlanEntity | null;
  existingCount: number;
}

@Injectable()
export class TermAssessmentPlanService {
  constructor(
    @InjectRepository(TermAssessmentPlanEntity)
    private readonly planRepo: Repository<TermAssessmentPlanEntity>,
    @InjectRepository(AssessmentEntity)
    private readonly assessmentRepo: Repository<AssessmentEntity>,
    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,
  ) {}

  async create(
    dto: CreateTermAssessmentPlanDto,
    sectionHeadId: string,
  ): Promise<TermAssessmentPlanEntity> {
    const existing = await this.planRepo.findOne({
      where: { subjectId: dto.subjectId, termId: dto.termId },
    });
    if (existing) {
      throw new ConflictException(
        'An assessment plan already exists for this subject and term. Use PATCH to update it.',
      );
    }
    const plan = this.planRepo.create({
      subjectId: dto.subjectId,
      termId: dto.termId,
      requiredAssessmentCount: dto.requiredAssessmentCount,
      setBySectionHeadId: sectionHeadId,
    });
    return this.planRepo.save(plan);
  }

  async findAll(termId?: number): Promise<TermAssessmentPlanEntity[]> {
    const where = termId ? { termId } : {};
    return this.planRepo.find({
      where,
      order: { term: { termNumber: 'ASC' }, subject: { name: 'ASC' } },
    });
  }

  async findById(id: number): Promise<TermAssessmentPlanEntity> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Assessment plan #${id} not found.`);
    return plan;
  }

  async update(
    id: number,
    dto: UpdateTermAssessmentPlanDto,
    sectionHeadId: string,
  ): Promise<TermAssessmentPlanEntity> {
    const plan = await this.findById(id);
    plan.requiredAssessmentCount = dto.requiredAssessmentCount;
    plan.setBySectionHeadId = sectionHeadId;
    return this.planRepo.save(plan);
  }

  async remove(id: number): Promise<void> {
    const plan = await this.findById(id);
    const count = await this.assessmentRepo.count({
      where: { subjectId: plan.subjectId, termId: plan.termId },
    });
    if (count > 0) {
      throw new ConflictException(
        `Cannot delete plan — ${count} assessment(s) already exist for this subject and term.`,
      );
    }
    await this.planRepo.delete(id);
  }

  async findMySubjectPlans(
    teacherId: string,
    termId: number,
  ): Promise<SubjectPlanSummary[]> {
    const requirements = await this.requirementRepo.find({
      where: { teacherId },
    });

    const uniqueSubjectIds = [...new Set(requirements.map((r) => r.subjectId))];

    const results: SubjectPlanSummary[] = await Promise.all(
      uniqueSubjectIds.map(async (subjectId) => {
        const req = requirements.find((r) => r.subjectId === subjectId)!;
        const plan = await this.planRepo.findOne({
          where: { subjectId, termId },
        });
        const existingCount = await this.assessmentRepo.count({
          where: { subjectId, termId },
        });
        return {
          subjectId,
          subjectName: req.subject.name,
          subjectCode: req.subject.code,
          plan: plan ?? null,
          existingCount,
        };
      }),
    );

    return results.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }
}
