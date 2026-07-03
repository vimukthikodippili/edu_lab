import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { SubstituteService } from './substitute.service';
import { SubstituteAssignmentEntity, SubstituteStatus } from './entities/substitute-assignment.entity';
import { TimetableEntryEntity } from './entities/timetable-entry.entity';
import { TeacherSubjectClassRequirementEntity } from '../teacher-subject-requirements/entities/teacher-subject-class-requirement.entity';
import { StaffEntity, StaffStatus } from '../staff/entities/staff.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { LeaveApprovedEvent } from '../leave/events/leave-approved.event';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findBy: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
  count: jest.fn(),
});

const makeStaff = (id: string, status = StaffStatus.ACTIVE): Partial<StaffEntity> => ({
  id,
  firstName: `First-${id.slice(0, 4)}`,
  lastName: `Last-${id.slice(0, 4)}`,
  status,
  email: `${id}@sims.edu.lk`,
});

const makeEntry = (
  teacherId: string,
  day: number,
  period: number,
  subjectId = 'sub-math',
  classSectionId = 1,
): Partial<TimetableEntryEntity> => ({
  teacherId,
  day,
  period,
  subjectId,
  classSectionId,
  academicYear: '2026',
  classSection: { id: classSectionId, name: `Grade 10A` } as any,
  subject: { id: subjectId, name: 'Mathematics' } as any,
});

describe('SubstituteService', () => {
  let service: SubstituteService;
  let subAssignRepo: MockRepo<SubstituteAssignmentEntity>;
  let entryRepo: MockRepo<TimetableEntryEntity>;
  let requirementRepo: MockRepo<TeacherSubjectClassRequirementEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let userRepo: MockRepo<UserEntity>;
  let notificationService: { createForStaff: jest.Mock };

  beforeEach(async () => {
    subAssignRepo    = repoMock<SubstituteAssignmentEntity>();
    entryRepo        = repoMock<TimetableEntryEntity>();
    requirementRepo  = repoMock<TeacherSubjectClassRequirementEntity>();
    staffRepo        = repoMock<StaffEntity>();
    userRepo         = repoMock<UserEntity>();
    notificationService = { createForStaff: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubstituteService,
        { provide: getRepositoryToken(SubstituteAssignmentEntity), useValue: subAssignRepo },
        { provide: getRepositoryToken(TimetableEntryEntity),       useValue: entryRepo },
        { provide: getRepositoryToken(TeacherSubjectClassRequirementEntity), useValue: requirementRepo },
        { provide: getRepositoryToken(StaffEntity),                useValue: staffRepo },
        { provide: getRepositoryToken(UserEntity),                 useValue: userRepo },
        { provide: NotificationService,                            useValue: notificationService },
      ],
    }).compile();

    service = module.get<SubstituteService>(SubstituteService);
    jest.clearAllMocks();
    subAssignRepo.save!.mockImplementation((d: unknown) => Promise.resolve(d));
    subAssignRepo.create!.mockImplementation((d: unknown) => d);
    notificationService.createForStaff.mockResolvedValue(undefined);
  });

  // ─── findFreeCandidates ───────────────────────────────────────────────────────

  describe('findFreeCandidates()', () => {
    it('excludes teachers already booked at the given day+period slot', async () => {
      // teacher-A is busy, teacher-B is free
      entryRepo.find!.mockResolvedValue([
        { teacherId: 'teacher-A' },
      ]);
      requirementRepo.find!.mockResolvedValue([]);
      staffRepo.find!.mockResolvedValue([
        makeStaff('teacher-A'),
        makeStaff('teacher-B'),
      ]);

      const candidates = await service.findFreeCandidates(1, 2, '2026', 'sub-math');

      expect(candidates.map((c) => c.id)).not.toContain('teacher-A');
      expect(candidates.map((c) => c.id)).toContain('teacher-B');
    });

    it('ranks subject-expert teachers before non-experts', async () => {
      entryRepo.find!.mockResolvedValue([]);
      requirementRepo.find!.mockResolvedValue([
        { teacherId: 'teacher-expert' },
      ]);
      staffRepo.find!.mockResolvedValue([
        makeStaff('teacher-non-expert'),
        makeStaff('teacher-expert'),
      ]);

      const candidates = await service.findFreeCandidates(1, 2, '2026', 'sub-math');

      expect(candidates[0].id).toBe('teacher-expert');
      expect(candidates[0].isSubjectExpert).toBe(true);
      expect(candidates[1].isSubjectExpert).toBe(false);
    });
  });

  // ─── processLeaveApprovedEvent ────────────────────────────────────────────────

  describe('processLeaveApprovedEvent()', () => {
    it('creates one SubstituteAssignment per timetable slot for each date in the leave range', async () => {
      // Leave: Monday Aug 4 2026 → Tuesday Aug 5 2026 (2 days)
      // Teacher has 1 slot on Mon (day=1, period=3) and 1 slot on Tue (day=2, period=1)
      const event = new LeaveApprovedEvent(
        'lr-1',
        'teacher-absent',
        'medical',
        new Date('2026-08-03'), // Mon
        new Date('2026-08-04'), // Tue
      );

      // entryRepo.find is called 4 times (interleaved):
      // 1. Mon teacher entries  2. findFreeCandidates busy@(1,3)
      // 3. Tue teacher entries  4. findFreeCandidates busy@(2,1)
      entryRepo.find!
        .mockResolvedValueOnce([makeEntry('teacher-absent', 1, 3)]) // Call 1: Mon entries
        .mockResolvedValueOnce([])                                   // Call 2: busy@(1,3)
        .mockResolvedValueOnce([makeEntry('teacher-absent', 2, 1)]) // Call 3: Tue entries
        .mockResolvedValue([]);                                      // Call 4: busy@(2,1)
      subAssignRepo.findOne!.mockResolvedValue(null); // no existing records
      requirementRepo.find!.mockResolvedValue([]);
      staffRepo.find!.mockResolvedValue([makeStaff('teacher-free')]);
      userRepo.find!.mockResolvedValue([]);

      await service.processLeaveApprovedEvent(event);

      // One save per slot (2 dates × 1 slot each = 2 saves)
      expect(subAssignRepo.save).toHaveBeenCalledTimes(2);
    });

    it('notifies admin/section_head staff after creating suggestions', async () => {
      const event = new LeaveApprovedEvent(
        'lr-2',
        'teacher-absent',
        'annual',
        new Date('2026-08-03'), // Mon
        new Date('2026-08-03'), // single day
      );

      entryRepo.find!
        .mockResolvedValueOnce([makeEntry('teacher-absent', 1, 2)]) // Mon slots
        .mockResolvedValue([]); // findFreeCandidates calls
      subAssignRepo.findOne!.mockResolvedValue(null);
      requirementRepo.find!.mockResolvedValue([]);
      staffRepo.find!
        .mockResolvedValueOnce([makeStaff('teacher-free')]) // findFreeCandidates allActive
        .mockResolvedValueOnce([{ id: 'admin-staff-1', email: 'admin@sims.edu.lk' }]); // notifyAdminStaff
      userRepo.find!.mockResolvedValue([{ email: 'admin@sims.edu.lk' }]);

      await service.processLeaveApprovedEvent(event);

      expect(notificationService.createForStaff).toHaveBeenCalledWith(
        'admin-staff-1',
        'Substitute Cover Needed',
        expect.stringContaining('slot(s) need substitute cover'),
        'substitute_suggestion',
      );
    });
  });

  // ─── assign ───────────────────────────────────────────────────────────────────

  describe('assign()', () => {
    it('throws NotFoundException when assignment does not exist', async () => {
      subAssignRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.assign('no-such-id', 'sub-id', 'actor-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when the selected teacher is busy at the slot', async () => {
      const assignment: Partial<SubstituteAssignmentEntity> = {
        id: 'sa-1',
        day: 1,
        period: 2,
        academicYear: '2026',
        subjectId: 'sub-math',
        status: SubstituteStatus.SUGGESTED,
        absentTeacher: makeStaff('teacher-absent') as StaffEntity,
        classSection: { id: 1, name: 'Grade 10A' } as any,
        subject: { id: 'sub-math', name: 'Mathematics' } as any,
        suggestedSubstitute: null,
        assignedSubstitute: null,
      };
      subAssignRepo.findOne!.mockResolvedValue(assignment);

      // findFreeCandidates: 'busy-teacher' is NOT free (already booked)
      entryRepo.find!.mockResolvedValue([{ teacherId: 'busy-teacher' }]);
      requirementRepo.find!.mockResolvedValue([]);
      staffRepo.find!.mockResolvedValue([makeStaff('free-teacher')]);

      await expect(
        service.assign('sa-1', 'busy-teacher', 'actor-id'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
