import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SubjectTopicEntity } from './entities/subject-topic.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';

const DEFAULT_TOPIC_TITLE = 'General';

@Injectable()
export class SubjectTopicsService {
  constructor(
    @InjectRepository(SubjectTopicEntity)
    private readonly topicRepo: Repository<SubjectTopicEntity>,

    @InjectRepository(TeacherSubjectClassRequirementEntity)
    private readonly requirementRepo: Repository<TeacherSubjectClassRequirementEntity>,

    private readonly dataSource: DataSource,
  ) {}

  private async assertOwnsSubject(
    teacherId: string,
    subjectId: string,
    isPrivileged: boolean,
  ): Promise<void> {
    if (isPrivileged) return;
    const requirement = await this.requirementRepo.findOne({
      where: { teacherId, subjectId },
    });
    if (!requirement) {
      throw new ForbiddenException('You do not teach this subject.');
    }
  }

  /** Plain lookup, no isArchived filter — this is what a future per-topic mark
   * allocation would call to resolve a topic by id regardless of archive state. */
  async findById(id: string): Promise<SubjectTopicEntity> {
    const topic = await this.topicRepo.findOne({ where: { id } });
    if (!topic) throw new NotFoundException(`Subject topic ${id} not found.`);
    return topic;
  }

  /** Seeds a single "General" topic only when zero rows exist at all for this
   * (subjectId, teacherId) pair — never re-seeds just because everything currently
   * active happens to be archived, since that's a deliberate teacher action. */
  async findActiveForSubject(
    subjectId: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<SubjectTopicEntity[]> {
    await this.assertOwnsSubject(teacherId, subjectId, isPrivileged);

    const existingCount = await this.topicRepo.count({ where: { subjectId, teacherId } });
    if (existingCount === 0) {
      await this.topicRepo.save(
        this.topicRepo.create({ subjectId, teacherId, title: DEFAULT_TOPIC_TITLE, order: 1 }),
      );
    }

    return this.topicRepo.find({
      where: { subjectId, teacherId, isArchived: false },
      order: { order: 'ASC' },
    });
  }

  async create(
    subjectId: string,
    teacherId: string,
    title: string,
    isPrivileged: boolean,
  ): Promise<SubjectTopicEntity> {
    await this.assertOwnsSubject(teacherId, subjectId, isPrivileged);

    const maxOrder = await this.topicRepo.maximum('order', { subjectId, teacherId });
    return this.topicRepo.save(
      this.topicRepo.create({ subjectId, teacherId, title, order: (maxOrder ?? 0) + 1 }),
    );
  }

  async rename(
    id: string,
    teacherId: string,
    title: string,
    isPrivileged: boolean,
  ): Promise<SubjectTopicEntity> {
    const topic = await this.findById(id);
    if (!isPrivileged && topic.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this topic.');
    }
    topic.title = title;
    return this.topicRepo.save(topic);
  }

  async archive(
    id: string,
    teacherId: string,
    isPrivileged: boolean,
  ): Promise<SubjectTopicEntity> {
    const topic = await this.findById(id);
    if (!isPrivileged && topic.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this topic.');
    }
    topic.isArchived = true;
    return this.topicRepo.save(topic);
  }

  async reorder(
    subjectId: string,
    teacherId: string,
    topicIds: string[],
    isPrivileged: boolean,
  ): Promise<SubjectTopicEntity[]> {
    await this.assertOwnsSubject(teacherId, subjectId, isPrivileged);
    if (topicIds.length === 0) return [];

    const topics = await this.topicRepo.findBy(topicIds.map((id) => ({ id })));
    if (topics.length !== topicIds.length) {
      const foundIds = new Set(topics.map((t) => t.id));
      const missing = topicIds.find((id) => !foundIds.has(id));
      throw new NotFoundException(`Subject topic ${missing ?? 'unknown'} not found.`);
    }

    const mismatch = topics.find((t) => t.subjectId !== subjectId || t.teacherId !== teacherId);
    if (mismatch) {
      throw new BadRequestException(
        'All topics in a reorder request must belong to this subject and teacher.',
      );
    }
    const archived = topics.find((t) => t.isArchived);
    if (archived) {
      throw new BadRequestException('Cannot reorder an archived topic.');
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SubjectTopicEntity);

      // Temporarily set orders to negative values to avoid unique constraint conflicts.
      for (const topic of topics) {
        await repo.update(topic.id, { order: -topic.order - 1 });
      }

      const updated: SubjectTopicEntity[] = [];
      for (let i = 0; i < topicIds.length; i++) {
        const topic = topics.find((t) => t.id === topicIds[i])!;
        topic.order = i + 1;
        updated.push(await repo.save(topic));
      }
      return updated;
    });
  }
}
