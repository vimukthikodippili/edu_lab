import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareerAssessmentEntity } from './entities/career-assessment.entity';
import { OCEAN_QUESTIONS } from './data/ocean-questions';
import { RIASEC_QUESTIONS } from './data/riasec-questions';
import { buildTraitDescriptions, rankRiasecSuggestions, scoreOcean, scoreRiasec } from './career-scoring';
import { OceanQuestion, QuestionAnswer, RiasecQuestion } from './career.types';

@Injectable()
export class CareerAssessmentService {
  constructor(
    @InjectRepository(CareerAssessmentEntity)
    private readonly assessmentRepo: Repository<CareerAssessmentEntity>,
  ) {}

  getOceanQuestions(): OceanQuestion[] {
    return OCEAN_QUESTIONS;
  }

  getRiasecQuestions(): RiasecQuestion[] {
    return RIASEC_QUESTIONS;
  }

  async submitOcean(userId: number, answers: QuestionAnswer[]): Promise<CareerAssessmentEntity> {
    const academicYear = String(new Date().getFullYear());

    const existing = await this.assessmentRepo.findOne({ where: { userId, academicYear } });
    if (existing) {
      throw new ConflictException(
        `You have already completed this assessment for ${academicYear}. You can retake it next year.`,
      );
    }

    const oceanScores = scoreOcean(answers);
    return this.assessmentRepo.save(
      this.assessmentRepo.create({
        userId,
        academicYear,
        oceanAnswers: answers,
        oceanScores,
      }),
    );
  }

  async submitRiasec(
    userId: number,
    assessmentId: string,
    answers: QuestionAnswer[],
  ): Promise<CareerAssessmentEntity> {
    const assessment = await this.assessmentRepo.findOne({ where: { id: assessmentId } });
    if (!assessment) {
      throw new NotFoundException(`Assessment ${assessmentId} not found.`);
    }
    if (assessment.userId !== userId) {
      throw new ForbiddenException('This assessment does not belong to you.');
    }

    const riasecScores = scoreRiasec(answers);
    assessment.riasecAnswers = answers;
    assessment.riasecScores = riasecScores;
    assessment.riasecSuggestions = rankRiasecSuggestions(riasecScores);
    return this.assessmentRepo.save(assessment);
  }

  async findMyResults(userId: number): Promise<CareerAssessmentEntity[]> {
    return this.assessmentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Counselor/Principal review path (FR-CE-04) — same query, keyed by an arbitrary userId
   * supplied by the caller (resolved to a studentId->userId on the frontend, never here —
   * this keeps the module's zero-dependency-on-StudentEntity guarantee intact). */
  async findForUser(userId: number): Promise<CareerAssessmentEntity[]> {
    return this.findMyResults(userId);
  }

  /** Pure helper reused by the controller to attach descriptive text without re-querying. */
  buildTraitDescriptions(assessment: CareerAssessmentEntity) {
    return assessment.oceanScores ? buildTraitDescriptions(assessment.oceanScores) : [];
  }
}
