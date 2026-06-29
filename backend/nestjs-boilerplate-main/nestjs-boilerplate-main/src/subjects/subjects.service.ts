import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubjectCategoryEntity } from './entities/subject-category.entity';
import { SubjectEntity } from './entities/subject.entity';
import { CreateSubjectCategoryDto } from './dto/create-subject-category.dto';
import { UpdateSubjectCategoryDto } from './dto/update-subject-category.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';

export interface PaginatedSubjects {
  data: SubjectEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(SubjectCategoryEntity)
    private readonly categoryRepository: Repository<SubjectCategoryEntity>,

    @InjectRepository(SubjectEntity)
    private readonly subjectRepository: Repository<SubjectEntity>,
  ) {}

  // ─── Subject Category Methods ──────────────────────────────────────────────

  async createCategory(dto: CreateSubjectCategoryDto): Promise<SubjectCategoryEntity> {
    const duplicate = await this.categoryRepository
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name: dto.name })
      .getOne();
    if (duplicate) {
      throw new ConflictException(`A subject category named "${dto.name}" already exists.`);
    }

    return this.categoryRepository.save(
      this.categoryRepository.create({
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? '#6c757d',
        isActive: true,
      }),
    );
  }

  async findAllCategories(includeInactive = false): Promise<SubjectCategoryEntity[]> {
    const qb = this.categoryRepository
      .createQueryBuilder('c')
      .orderBy('c.name', 'ASC');

    if (!includeInactive) {
      qb.where('c.isActive = true');
    }

    return qb.getMany();
  }

  async findCategoryById(id: number): Promise<SubjectCategoryEntity> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Subject category with id ${id} not found.`);
    }
    return category;
  }

  async updateCategory(
    id: number,
    dto: UpdateSubjectCategoryDto,
  ): Promise<SubjectCategoryEntity> {
    const category = await this.findCategoryById(id);

    if (dto.name && dto.name.toLowerCase() !== category.name.toLowerCase()) {
      const duplicate = await this.categoryRepository
        .createQueryBuilder('c')
        .where('LOWER(c.name) = LOWER(:name)', { name: dto.name })
        .andWhere('c.id != :id', { id })
        .getOne();
      if (duplicate) {
        throw new ConflictException(`A subject category named "${dto.name}" already exists.`);
      }
    }

    return this.categoryRepository.save({
      ...category,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description ?? null }),
      ...(dto.color !== undefined && { color: dto.color }),
    });
  }

  async deactivateCategory(id: number): Promise<SubjectCategoryEntity> {
    const category = await this.findCategoryById(id);

    // Guard: cannot deactivate while active subjects exist in this category
    const activeSubjectCount = await this.subjectRepository.count({
      where: { categoryId: id, isActive: true },
    });
    if (activeSubjectCount > 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          categoryId: `Cannot deactivate: ${activeSubjectCount} active subject(s) must be deactivated first.`,
        },
      });
    }

    return this.categoryRepository.save({ ...category, isActive: false });
  }

  async reactivateCategory(id: number): Promise<SubjectCategoryEntity> {
    const category = await this.findCategoryById(id);
    return this.categoryRepository.save({ ...category, isActive: true });
  }

  // ─── Subject Methods ───────────────────────────────────────────────────────

  async create(dto: CreateSubjectDto): Promise<SubjectEntity> {
    // Validate category exists
    const category = await this.categoryRepository.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { categoryId: `Subject category with id ${dto.categoryId} does not exist.` },
      });
    }

    // Case-insensitive code uniqueness check
    const duplicate = await this.subjectRepository
      .createQueryBuilder('s')
      .where('UPPER(s.code) = UPPER(:code)', { code: dto.code })
      .getOne();
    if (duplicate) {
      throw new ConflictException(
        `A subject with code "${dto.code.toUpperCase()}" already exists (codes are case-insensitive).`,
      );
    }

    return this.subjectRepository.save(
      this.subjectRepository.create({
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description ?? null,
        categoryId: dto.categoryId,
        isActive: true,
      }),
    );
  }

  async findMany(query: QuerySubjectDto): Promise<PaginatedSubjects> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.subjectRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.category', 'category');

    if (!query.includeInactive) {
      qb.where('s.isActive = true');
    }
    if (query.search) {
      qb.andWhere('(s.name ILIKE :q OR s.code ILIKE :q)', { q: `%${query.search}%` });
    }
    if (query.categoryId) {
      qb.andWhere('s.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    const [data, total] = await qb
      .orderBy('s.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /** Resolves ANY subject by ID regardless of isActive — used for historical references. */
  async findById(id: string): Promise<SubjectEntity> {
    const subject = await this.subjectRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!subject) {
      throw new NotFoundException(`Subject with id ${id} not found.`);
    }
    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto): Promise<SubjectEntity> {
    const subject = await this.findById(id);

    // Code uniqueness check if code is being changed
    if (dto.code && dto.code.toUpperCase() !== subject.code.toUpperCase()) {
      const duplicate = await this.subjectRepository
        .createQueryBuilder('s')
        .where('UPPER(s.code) = UPPER(:code)', { code: dto.code })
        .andWhere('s.id != :id', { id })
        .getOne();
      if (duplicate) {
        throw new ConflictException(
          `A subject with code "${dto.code.toUpperCase()}" already exists.`,
        );
      }
    }

    // Validate new category if changing
    if (dto.categoryId !== undefined && dto.categoryId !== subject.categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: dto.categoryId } });
      if (!category) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { categoryId: `Subject category with id ${dto.categoryId} does not exist.` },
        });
      }
    }

    return this.subjectRepository.save({
      ...subject,
      ...(dto.code !== undefined && { code: dto.code.toUpperCase() }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description ?? null }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
    });
  }

  async deactivate(id: string): Promise<SubjectEntity> {
    const subject = await this.findById(id);
    return this.subjectRepository.save({ ...subject, isActive: false });
  }

  async reactivate(id: string): Promise<SubjectEntity> {
    const subject = await this.findById(id);

    // Guard: cannot reactivate into a deactivated category
    const category = await this.categoryRepository.findOne({ where: { id: subject.categoryId } });
    if (!category?.isActive) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          categoryId: `Cannot reactivate: category "${category?.name ?? subject.categoryId}" is inactive. Reactivate the category first.`,
        },
      });
    }

    return this.subjectRepository.save({ ...subject, isActive: true });
  }
}
