import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AcademicYearEntity, AcademicYearStatus } from '../entities/academic-year.entity';
import { AcademicTermEntity } from '../entities/academic-term.entity';
import { ClassSectionEntity } from '../../students/entities/class-section.entity';
import { StartAcademicYearDto } from '../dto/start-academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(
    @InjectRepository(AcademicYearEntity)
    private readonly academicYearRepo: Repository<AcademicYearEntity>,

    @InjectRepository(ClassSectionEntity)
    private readonly classSectionRepo: Repository<ClassSectionEntity>,

    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<AcademicYearEntity[]> {
    return this.academicYearRepo.find({ order: { year: 'DESC' } });
  }

  async startYear(
    dto: StartAcademicYearDto,
  ): Promise<{ academicYear: AcademicYearEntity; sectionsCreated: number; term: AcademicTermEntity }> {
    const existing = await this.academicYearRepo.findOne({ where: { year: dto.year } });
    if (existing) {
      throw new ConflictException(`Academic year ${dto.year} already exists.`);
    }

    return this.dataSource.transaction(async (manager) => {
      const academicYear = await manager.save(
        AcademicYearEntity,
        manager.create(AcademicYearEntity, { year: dto.year, status: AcademicYearStatus.ACTIVE }),
      );

      // Clone the most recent existing year's class sections (same grade + name) into the new
      // year, so there's somewhere for students to land when they're later promoted into it —
      // matches the exact prerequisite the Annual Promotion tool otherwise requires setting up
      // by hand first.
      const latest = await this.classSectionRepo
        .createQueryBuilder('cs')
        .select('cs.academicYear', 'year')
        .distinct(true)
        .orderBy('cs.academicYear', 'DESC')
        .limit(1)
        .getRawOne<{ year: string }>();

      let sectionsCreated = 0;
      if (latest?.year) {
        const sourceSections = await this.classSectionRepo.find({ where: { academicYear: latest.year } });
        for (const source of sourceSections) {
          const alreadyExists = await manager.findOne(ClassSectionEntity, {
            where: { gradeId: source.gradeId, name: source.name, academicYear: dto.year },
          });
          if (alreadyExists) continue;
          await manager.save(
            ClassSectionEntity,
            manager.create(ClassSectionEntity, {
              gradeId: source.gradeId,
              name: source.name,
              academicYear: dto.year,
            }),
          );
          sectionsCreated++;
        }
      }

      const term = await manager.save(
        AcademicTermEntity,
        manager.create(AcademicTermEntity, {
          name: dto.termName,
          termNumber: 1,
          academicYear: dto.year,
          startDate: dto.startDate,
          endDate: dto.endDate,
        }),
      );

      return { academicYear, sectionsCreated, term };
    });
  }

  async endYear(id: number, staffId: string): Promise<AcademicYearEntity> {
    const academicYear = await this.academicYearRepo.findOne({ where: { id } });
    if (!academicYear) {
      throw new NotFoundException(`Academic year ${id} not found.`);
    }
    if (academicYear.status === AcademicYearStatus.ENDED) {
      throw new ConflictException(`Academic year ${academicYear.year} has already ended.`);
    }

    academicYear.status = AcademicYearStatus.ENDED;
    academicYear.endedAt = new Date();
    academicYear.endedById = staffId;
    await this.academicYearRepo.save(academicYear);

    // Re-fetch rather than return the saved object directly: `endedBy` is an eager relation that
    // was still null on the in-memory entity (loaded before this update), and save() doesn't
    // repopulate it — a fresh read guarantees the response actually reflects the row just written,
    // same lesson as the promotion-service fix earlier this session.
    return this.academicYearRepo.findOneOrFail({ where: { id } });
  }
}
