import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PromotionRecommendationEntity } from '../entities/promotion-recommendation.entity';
import { StudentEntity } from '../entities/student.entity';
import { ClassSectionEntity } from '../entities/class-section.entity';
import { SubmitPromotionRecommendationDto } from '../dto/submit-promotion-recommendation.dto';

@Injectable()
export class PromotionRecommendationService {
  constructor(
    @InjectRepository(PromotionRecommendationEntity)
    private readonly recommendationRepo: Repository<PromotionRecommendationEntity>,

    @InjectRepository(StudentEntity)
    private readonly studentRepo: Repository<StudentEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,
  ) {}

  /** Submit or update the caller's own recommendation for a student in a section they currently head. */
  async submit(
    staffId: string,
    dto: SubmitPromotionRecommendationDto,
  ): Promise<PromotionRecommendationEntity> {
    const student = await this.studentRepo.findOne({ where: { id: dto.studentId } });
    if (!student) {
      throw new NotFoundException(`Student ${dto.studentId} not found.`);
    }

    const section = await this.classSectionRepo.findOne({
      where: { id: student.classSectionId, classTeacherStaffId: staffId },
    });
    if (!section) {
      throw new ForbiddenException(
        'You can only recommend students in a class section you are the class teacher for.',
      );
    }

    const existing = await this.recommendationRepo.findOne({
      where: { studentId: dto.studentId, academicYear: dto.academicYear },
    });

    if (existing) {
      existing.outcome = dto.outcome;
      existing.comment = dto.comment ?? null;
      existing.classSectionId = student.classSectionId;
      existing.recommendedById = staffId;
      return this.recommendationRepo.save(existing);
    }

    return this.recommendationRepo.save(
      this.recommendationRepo.create({
        studentId: dto.studentId,
        academicYear: dto.academicYear,
        classSectionId: student.classSectionId,
        recommendedById: staffId,
        outcome: dto.outcome,
        comment: dto.comment ?? null,
      }),
    );
  }

  /** All recommendations the caller has submitted for sections they currently head, for a given year. */
  async findMine(staffId: string, academicYear: string): Promise<PromotionRecommendationEntity[]> {
    const mySections = await this.classSectionRepo.find({
      where: { classTeacherStaffId: staffId },
    });
    if (mySections.length === 0) return [];

    return this.recommendationRepo.find({
      where: { academicYear, classSectionId: In(mySections.map((s) => s.id)) },
      order: { updatedAt: 'DESC' },
    });
  }

  /** All recommendations for a given year, keyed by studentId — for the admin promote screen. */
  async findForYear(academicYear: string): Promise<Map<string, PromotionRecommendationEntity>> {
    const rows = await this.recommendationRepo.find({ where: { academicYear } });
    return new Map(rows.map((r) => [r.studentId, r]));
  }
}
