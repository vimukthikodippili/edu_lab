import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SubjectTopicsService } from './subject-topics.service';
import { SubjectTopicEntity } from './entities/subject-topic.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';

const subjectId = 'subject-uuid-1';
const teacherId = 'teacher-uuid-1';
const otherTeacherId = 'teacher-uuid-2';

describe('SubjectTopicsService', () => {
  let service: SubjectTopicsService;
  let topicRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    findBy: jest.Mock;
    count: jest.Mock;
    maximum: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let requirementRepo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    topicRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      maximum: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'topic-new', ...data })),
      update: jest.fn().mockResolvedValue(undefined),
    };
    requirementRepo = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => cb({ getRepository: () => topicRepo })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectTopicsService,
        { provide: getRepositoryToken(SubjectTopicEntity), useValue: topicRepo },
        {
          provide: getRepositoryToken(TeacherSubjectClassRequirementEntity),
          useValue: requirementRepo,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<SubjectTopicsService>(SubjectTopicsService);
  });

  describe('findActiveForSubject', () => {
    it('seeds a single "General" topic when none exist at all for this subject/teacher', async () => {
      topicRepo.count.mockResolvedValue(0);
      topicRepo.find.mockResolvedValue([
        { id: 'general-1', title: 'General', order: 1, isArchived: false },
      ]);

      const result = await service.findActiveForSubject(subjectId, teacherId, false);

      expect(topicRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId, teacherId, title: 'General', order: 1 }),
      );
      expect(result).toHaveLength(1);
    });

    it('does not re-seed when topics exist but all are archived', async () => {
      topicRepo.count.mockResolvedValue(2);
      topicRepo.find.mockResolvedValue([]);

      const result = await service.findActiveForSubject(subjectId, teacherId, false);

      expect(topicRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('excludes archived topics from the active list', async () => {
      topicRepo.count.mockResolvedValue(2);
      topicRepo.find.mockResolvedValue([{ id: 'active-1', isArchived: false }]);

      const result = await service.findActiveForSubject(subjectId, teacherId, false);

      expect(topicRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subjectId, teacherId, isArchived: false } }),
      );
      expect(result).toEqual([{ id: 'active-1', isArchived: false }]);
    });

    it('rejects a teacher who does not teach this subject', async () => {
      requirementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findActiveForSubject(subjectId, otherTeacherId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a privileged caller (admin/principal) to bypass the ownership check', async () => {
      requirementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findActiveForSubject(subjectId, teacherId, true),
      ).resolves.toBeDefined();
      expect(requirementRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('appends the new topic at maxOrder + 1', async () => {
      topicRepo.maximum.mockResolvedValue(3);

      await service.create(subjectId, teacherId, 'Algebra', false);

      expect(topicRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId, teacherId, title: 'Algebra', order: 4 }),
      );
    });

    it('starts at order 1 when no topics exist yet', async () => {
      topicRepo.maximum.mockResolvedValue(null);

      await service.create(subjectId, teacherId, 'Algebra', false);

      expect(topicRepo.save).toHaveBeenCalledWith(expect.objectContaining({ order: 1 }));
    });

    it('rejects a teacher who does not teach this subject', async () => {
      requirementRepo.findOne.mockResolvedValue(null);

      await expect(service.create(subjectId, otherTeacherId, 'Algebra', false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findById', () => {
    it('returns an archived topic — proves it still resolves for future historical references', async () => {
      topicRepo.findOne.mockResolvedValue({ id: 'topic-1', isArchived: true, title: 'Old Topic' });

      const result = await service.findById('topic-1');

      expect(result.isArchived).toBe(true);
      expect(topicRepo.findOne).toHaveBeenCalledWith({ where: { id: 'topic-1' } });
    });

    it('throws NotFoundException when the topic does not exist', async () => {
      topicRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('rename', () => {
    it('renames a topic the caller owns', async () => {
      topicRepo.findOne.mockResolvedValue({ id: 'topic-1', teacherId, title: 'Old' });

      const result = await service.rename('topic-1', teacherId, 'New Title', false);

      expect(result.title).toBe('New Title');
    });

    it('rejects renaming a topic owned by a different teacher', async () => {
      topicRepo.findOne.mockResolvedValue({ id: 'topic-1', teacherId: otherTeacherId, title: 'Old' });

      await expect(service.rename('topic-1', teacherId, 'New Title', false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows a privileged caller to rename any topic', async () => {
      topicRepo.findOne.mockResolvedValue({ id: 'topic-1', teacherId: otherTeacherId, title: 'Old' });

      await expect(
        service.rename('topic-1', teacherId, 'New Title', true),
      ).resolves.toBeDefined();
    });
  });

  describe('archive', () => {
    it('sets isArchived to true without deleting the row', async () => {
      const topic = { id: 'topic-1', teacherId, title: 'Algebra', isArchived: false };
      topicRepo.findOne.mockResolvedValue(topic);

      const result = await service.archive('topic-1', teacherId, false);

      expect(result.isArchived).toBe(true);
      expect(topicRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isArchived: true }));
    });

    it('rejects archiving a topic owned by a different teacher', async () => {
      topicRepo.findOne.mockResolvedValue({ id: 'topic-1', teacherId: otherTeacherId });

      await expect(service.archive('topic-1', teacherId, false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('reorder', () => {
    const topics = [
      { id: 't1', subjectId, teacherId, order: 1, isArchived: false },
      { id: 't2', subjectId, teacherId, order: 2, isArchived: false },
      { id: 't3', subjectId, teacherId, order: 3, isArchived: false },
    ];

    it('reassigns order to match the given array position', async () => {
      topicRepo.findBy.mockResolvedValue(topics);

      const result = await service.reorder(subjectId, teacherId, ['t3', 't1', 't2'], false);

      expect(result.map((t) => t.order)).toEqual([1, 2, 3]);
      expect(result.map((t) => t.id)).toEqual(['t3', 't1', 't2']);
      // negative-order dodge happened first
      expect(topicRepo.update).toHaveBeenCalledWith('t1', { order: -2 });
      expect(topicRepo.update).toHaveBeenCalledWith('t2', { order: -3 });
      expect(topicRepo.update).toHaveBeenCalledWith('t3', { order: -4 });
    });

    it('throws NotFoundException when a topic id does not exist', async () => {
      topicRepo.findBy.mockResolvedValue([topics[0]]);

      await expect(
        service.reorder(subjectId, teacherId, ['t1', 'missing'], false),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects reordering topics from a different subject or teacher', async () => {
      topicRepo.findBy.mockResolvedValue([
        topics[0],
        { id: 't2', subjectId: 'other-subject', teacherId, order: 2, isArchived: false },
      ]);

      await expect(
        service.reorder(subjectId, teacherId, ['t1', 't2'], false),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects reordering an archived topic', async () => {
      topicRepo.findBy.mockResolvedValue([
        topics[0],
        { id: 't2', subjectId, teacherId, order: 2, isArchived: true },
      ]);

      await expect(
        service.reorder(subjectId, teacherId, ['t1', 't2'], false),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a teacher who does not teach this subject', async () => {
      requirementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reorder(subjectId, otherTeacherId, ['t1'], false),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
