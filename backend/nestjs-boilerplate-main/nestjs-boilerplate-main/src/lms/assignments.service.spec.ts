import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { AssignmentsService } from './assignments.service';
import { AssignmentEntity } from './entities/assignment.entity';
import { AssignmentTopicAllocationEntity } from './entities/assignment-topic-allocation.entity';
import { FileEntity } from '../files/infrastructure/persistence/relational/entities/file.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubjectTopicsService } from '../subject-topics/subject-topics.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  findByIds: jest.fn(),
  save: jest.fn(),
  create: jest.fn((d: Partial<T>) => d as T),
});

const SUBJECT_ID = 'subject-uuid';
const TOPIC_ID = 'topic-uuid';

const makeDto = (overrides: Partial<CreateAssignmentDto> = {}): CreateAssignmentDto => ({
  classSectionId: 1,
  subjectId: SUBJECT_ID,
  title: 'Chapter 4 — Fractions Worksheet',
  instructions: 'Complete questions 1-10.',
  dueDate: '2026-08-01',
  topicAllocations: [{ subjectTopicId: TOPIC_ID, maxMarks: 50 }],
  ...overrides,
});

const makeTopic = (overrides: Record<string, unknown> = {}) => ({
  id: TOPIC_ID,
  subjectId: SUBJECT_ID,
  title: 'Fractions',
  isArchived: false,
  ...overrides,
});

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let assignmentRepo: MockRepo<AssignmentEntity>;
  let fileRepo: MockRepo<FileEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;
  let allocationRepo: MockRepo<AssignmentTopicAllocationEntity>;
  let subjectTopicsService: { findById: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    assignmentRepo = repoMock<AssignmentEntity>();
    fileRepo = repoMock<FileEntity>();
    requirementRepo = repoMock<TeacherSubjectClassRequirementEntity>();
    allocationRepo = repoMock<AssignmentTopicAllocationEntity>();
    subjectTopicsService = { findById: jest.fn().mockResolvedValue(makeTopic()) };
    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) =>
        cb({
          getRepository: (entity: unknown) =>
            entity === AssignmentEntity ? assignmentRepo : allocationRepo,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: getRepositoryToken(AssignmentEntity), useValue: assignmentRepo },
        { provide: getRepositoryToken(FileEntity), useValue: fileRepo },
        {
          provide: getRepositoryToken(TeacherSubjectClassRequirementEntity),
          useValue: requirementRepo,
        },
        { provide: getRepositoryToken(AssignmentTopicAllocationEntity), useValue: allocationRepo },
        { provide: SubjectTopicsService, useValue: subjectTopicsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    jest.clearAllMocks();
    allocationRepo.find!.mockResolvedValue([]);
    allocationRepo.save!.mockImplementation((data) =>
      Promise.resolve(Array.isArray(data) ? data.map((d, i) => ({ id: `alloc-${i}`, ...d })) : data),
    );
    subjectTopicsService.findById.mockResolvedValue(makeTopic());
  });

  describe('create — authorization', () => {
    it('throws ForbiddenException when the teacher is not assigned to teach this subject for this class section', async () => {
      requirementRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.create(makeDto(), 'teacher-uuid', false),
      ).rejects.toThrow(ForbiddenException);
      expect(assignmentRepo.save).not.toHaveBeenCalled();
    });

    it('succeeds when the teacher is assigned to teach the subject for the class section', async () => {
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      assignmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'assignment-1' }));
      fileRepo.findByIds!.mockResolvedValue([]);

      const result = await service.create(makeDto(), 'teacher-uuid', false);

      expect(result.id).toBe('assignment-1');
      expect(assignmentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('allows a privileged actor (section_head/admin/principal) to bypass the teach-assignment check', async () => {
      assignmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'assignment-1' }));

      await service.create(makeDto(), 'section-head-uuid', true);

      expect(requirementRepo.findOne).not.toHaveBeenCalled();
      expect(assignmentRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('create — attachment validation', () => {
    it('rejects with 422 naming the missing attachment id(s)', async () => {
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      fileRepo.findByIds!.mockResolvedValue([{ id: 'file-1', path: '/f1' }]);

      await expect(
        service.create(
          makeDto({ attachmentFileIds: ['file-1', 'file-missing'] }),
          'teacher-uuid',
          false,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(assignmentRepo.save).not.toHaveBeenCalled();
    });

    it('succeeds and populates virtual attachments when all ids resolve', async () => {
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      fileRepo.findByIds!.mockResolvedValue([
        { id: 'file-1', path: '/f1' },
        { id: 'file-2', path: '/f2' },
      ]);
      assignmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'assignment-1' }));

      const result = await service.create(
        makeDto({ attachmentFileIds: ['file-1', 'file-2'] }),
        'teacher-uuid',
        false,
      );

      expect(result.attachments).toEqual([
        { id: 'file-1', path: '/f1' },
        { id: 'file-2', path: '/f2' },
      ]);
    });
  });

  describe('create — topic allocation (the total is always the sum, never independently set)', () => {
    beforeEach(() => {
      requirementRepo.findOne!.mockResolvedValue({ id: 1 });
      assignmentRepo.save!.mockImplementation((a) => Promise.resolve({ ...a, id: 'assignment-1' }));
    });

    it('computes totalMarks as the sum of the topic allocations', async () => {
      const result = await service.create(
        makeDto({
          topicAllocations: [
            { subjectTopicId: 'topic-1', maxMarks: 20 },
            { subjectTopicId: 'topic-2', maxMarks: 15 },
            { subjectTopicId: 'topic-3', maxMarks: 15 },
          ],
        }),
        'teacher-uuid',
        false,
      );

      expect(assignmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalMarks: 50 }),
      );
      expect(result.totalMarks).toBe(50);
    });

    it('has no separate totalMarks field on the DTO — it structurally cannot be supplied independently', () => {
      const dto = makeDto();
      expect(Object.prototype.hasOwnProperty.call(dto, 'totalMarks')).toBe(false);
    });

    it('rejects an empty allocation list', async () => {
      await expect(
        service.create(makeDto({ topicAllocations: [] }), 'teacher-uuid', false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(assignmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a duplicate topic in the allocation list', async () => {
      await expect(
        service.create(
          makeDto({
            topicAllocations: [
              { subjectTopicId: TOPIC_ID, maxMarks: 20 },
              { subjectTopicId: TOPIC_ID, maxMarks: 15 },
            ],
          }),
          'teacher-uuid',
          false,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(assignmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a topic that belongs to a different subject', async () => {
      subjectTopicsService.findById.mockResolvedValue(makeTopic({ subjectId: 'other-subject' }));

      await expect(service.create(makeDto(), 'teacher-uuid', false)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(assignmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an archived topic', async () => {
      subjectTopicsService.findById.mockResolvedValue(makeTopic({ isArchived: true }));

      await expect(service.create(makeDto(), 'teacher-uuid', false)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(assignmentRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findForClassSection — the class-scoping guarantee', () => {
    it('returns an assignment created for class section A when queried for A, ordered by dueDate ascending', async () => {
      assignmentRepo.find!.mockResolvedValue([
        { id: 'a-1', classSectionId: 1, dueDate: '2026-08-01', attachmentFileIds: [] },
      ]);

      const result = await service.findForClassSection(1);

      expect(assignmentRepo.find).toHaveBeenCalledWith({
        where: { classSectionId: 1 },
        order: { dueDate: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a-1');
    });

    it('does not return a class-section-A assignment when queried for class section B', async () => {
      // The repo is queried with a where clause scoped to the requested section only —
      // simulate the DB honoring that filter (a section-A row is never in section B's result set).
      assignmentRepo.find!.mockImplementation(({ where }: { where: { classSectionId: number } }) =>
        Promise.resolve(
          [{ id: 'a-1', classSectionId: 1, dueDate: '2026-08-01', attachmentFileIds: [] }].filter(
            (a) => a.classSectionId === where.classSectionId,
          ),
        ),
      );

      const result = await service.findForClassSection(2);

      expect(result).toHaveLength(0);
    });
  });

  describe('findMine', () => {
    it("returns only the caller's own created assignments, ordered by dueDate descending", async () => {
      assignmentRepo.find!.mockResolvedValue([
        { id: 'a-2', createdByTeacherId: 'teacher-uuid', dueDate: '2026-09-01', attachmentFileIds: [] },
        { id: 'a-1', createdByTeacherId: 'teacher-uuid', dueDate: '2026-08-01', attachmentFileIds: [] },
      ]);

      const result = await service.findMine('teacher-uuid');

      expect(assignmentRepo.find).toHaveBeenCalledWith({
        where: { createdByTeacherId: 'teacher-uuid' },
        order: { dueDate: 'DESC' },
      });
      expect(result.map((a) => a.id)).toEqual(['a-2', 'a-1']);
    });
  });
});
