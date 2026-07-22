import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { SportsService } from './sports.service';
import { SportEntity } from './entities/sport.entity';
import { SportTypeEntity } from './entities/sport-type.entity';
import { SportEnrollmentEntity } from './entities/sport-enrollment.entity';
import { MatchEntity, MatchType, TeamResult } from './entities/match.entity';
import { TrainingSessionEntity } from './entities/training-session.entity';
import { StaffEntity } from '../staff/entities/staff.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { CreateSportDto } from './dto/create-sport.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'new-id', ...(d as object) })),
  create: jest.fn((d: Partial<T>) => d as T),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const COACH_ID = 'coach-uuid';
const STUDENT_ID = 'student-uuid';
const SPORT_ID = 'sport-uuid';
const OTHER_SPORT_ID = 'sport-uuid-other';
const MATCH_ID = 'match-uuid';
const SPORT_TYPE_ID = 'sport-type-cricket-uuid';

const makeSport = (overrides: Partial<SportEntity> = {}): SportEntity =>
  ({
    id: SPORT_ID,
    name: 'Cricket First XI',
    sportTypeId: SPORT_TYPE_ID,
    sportType: { id: SPORT_TYPE_ID, name: 'Cricket', isPersonalBestEligible: false },
    seasonStart: new Date('2026-01-15'),
    seasonEnd: new Date('2026-06-30'),
    description: null,
    coachId: COACH_ID,
    ...overrides,
  } as SportEntity);

const makeDto = (overrides: Partial<CreateSportDto> = {}): CreateSportDto => ({
  name: 'Cricket First XI',
  sportTypeId: SPORT_TYPE_ID,
  seasonStart: '2026-01-15',
  seasonEnd: '2026-06-30',
  coachId: COACH_ID,
  ...overrides,
});

const makeMatchDto = (overrides: Partial<CreateMatchDto> = {}): CreateMatchDto => ({
  date: '2026-08-15',
  opponent: 'Royal College',
  venue: 'Home Ground',
  matchType: MatchType.FRIENDLY,
  ...overrides,
});

const makeTrainingSessionDto = (
  overrides: Partial<CreateTrainingSessionDto> = {},
): CreateTrainingSessionDto => ({
  date: '2026-08-10',
  description: 'Fielding drills and net practice.',
  attendeeStudentIds: [STUDENT_ID],
  ...overrides,
});

describe('SportsService', () => {
  let service: SportsService;
  let sportRepo: MockRepo<SportEntity>;
  let sportTypeRepo: MockRepo<SportTypeEntity>;
  let enrollmentRepo: MockRepo<SportEnrollmentEntity>;
  let staffRepo: MockRepo<StaffEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let matchRepo: MockRepo<MatchEntity>;
  let trainingSessionRepo: MockRepo<TrainingSessionEntity>;

  beforeEach(async () => {
    sportRepo = repoMock<SportEntity>();
    sportTypeRepo = repoMock<SportTypeEntity>();
    enrollmentRepo = repoMock<SportEnrollmentEntity>();
    staffRepo = repoMock<StaffEntity>();
    studentRepo = repoMock<StudentEntity>();
    matchRepo = repoMock<MatchEntity>();
    trainingSessionRepo = repoMock<TrainingSessionEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SportsService,
        { provide: getRepositoryToken(SportEntity), useValue: sportRepo },
        { provide: getRepositoryToken(SportTypeEntity), useValue: sportTypeRepo },
        { provide: getRepositoryToken(SportEnrollmentEntity), useValue: enrollmentRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(MatchEntity), useValue: matchRepo },
        { provide: getRepositoryToken(TrainingSessionEntity), useValue: trainingSessionRepo },
      ],
    }).compile();

    service = module.get<SportsService>(SportsService);
    jest.clearAllMocks();
    staffRepo.findOne!.mockResolvedValue({ id: COACH_ID, firstName: 'Coach', lastName: 'One' });
    sportTypeRepo.findOne!.mockResolvedValue({ id: SPORT_TYPE_ID, name: 'Cricket', isPersonalBestEligible: false });
    enrollmentRepo.find!.mockResolvedValue([{ sportId: SPORT_ID, studentId: STUDENT_ID }]);
  });

  describe('create', () => {
    it('creates a sport when the coach exists and the season dates are valid', async () => {
      const result = await service.create(makeDto());

      expect(sportRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('rejects a sport with no valid sportType — the explicitly-requested test', async () => {
      sportTypeRepo.findOne!.mockResolvedValueOnce(undefined);
      const dto = makeDto({ sportTypeId: 'not-a-real-sport-type-id' });

      await expect(service.create(dto)).rejects.toThrow(UnprocessableEntityException);
      expect(sportRepo.save).not.toHaveBeenCalled();
    });

    it('rejects when coachId does not reference an existing staff member', async () => {
      staffRepo.findOne!.mockResolvedValue(null);

      await expect(service.create(makeDto())).rejects.toThrow(UnprocessableEntityException);
      expect(sportRepo.save).not.toHaveBeenCalled();
    });

    it('rejects when seasonEnd is before seasonStart', async () => {
      const dto = makeDto({ seasonStart: '2026-06-30', seasonEnd: '2026-01-15' });

      await expect(service.create(dto)).rejects.toThrow(UnprocessableEntityException);
      expect(sportRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('enrollStudent', () => {
    beforeEach(() => {
      sportRepo.findOne!.mockResolvedValue(makeSport());
      studentRepo.findOne!.mockResolvedValue({
        id: STUDENT_ID,
        firstName: 'A',
        lastName: 'One',
        admissionNumber: 'A1',
        status: StudentStatus.ACTIVE,
      });
      enrollmentRepo.findOne!.mockResolvedValue(null);
    });

    it('enrolls a student successfully as the assigned coach', async () => {
      await service.enrollStudent(SPORT_ID, { studentId: STUDENT_ID }, COACH_ID, false);

      expect(enrollmentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('a student can be enrolled in multiple different sports — the explicitly-requested test', async () => {
      const otherSportId = 'sport-uuid-2';
      sportRepo.findOne!
        .mockResolvedValueOnce(makeSport({ id: SPORT_ID }))
        .mockResolvedValueOnce(makeSport({ id: otherSportId }));

      await service.enrollStudent(SPORT_ID, { studentId: STUDENT_ID }, COACH_ID, false);
      await service.enrollStudent(otherSportId, { studentId: STUDENT_ID }, COACH_ID, false);

      expect(enrollmentRepo.save).toHaveBeenCalledTimes(2);
      expect(enrollmentRepo.create).toHaveBeenNthCalledWith(1, { sportId: SPORT_ID, studentId: STUDENT_ID });
      expect(enrollmentRepo.create).toHaveBeenNthCalledWith(2, { sportId: otherSportId, studentId: STUDENT_ID });
    });

    it('rejects a duplicate enrollment in the same sport', async () => {
      enrollmentRepo.findOne!.mockResolvedValue({ id: 'existing-enrollment' });

      await expect(
        service.enrollStudent(SPORT_ID, { studentId: STUDENT_ID }, COACH_ID, false),
      ).rejects.toThrow(ConflictException);
      expect(enrollmentRepo.save).not.toHaveBeenCalled();
    });

    it('rejects when studentId does not reference an existing student', async () => {
      studentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.enrollStudent(SPORT_ID, { studentId: STUDENT_ID }, COACH_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws ForbiddenException when the caller is not the assigned coach and not privileged', async () => {
      await expect(
        service.enrollStudent(SPORT_ID, { studentId: STUDENT_ID }, 'someone-else', false),
      ).rejects.toThrow(ForbiddenException);
      expect(enrollmentRepo.save).not.toHaveBeenCalled();
    });

    it('allows a privileged actor (principal) to enroll a student even when not the coach', async () => {
      await service.enrollStudent(SPORT_ID, { studentId: STUDENT_ID }, 'principal-uuid', true);

      expect(enrollmentRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeFromRoster', () => {
    it('removes an existing enrollment as the assigned coach', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());
      enrollmentRepo.findOne!.mockResolvedValue({ id: 'enrollment-1', sportId: SPORT_ID, studentId: STUDENT_ID });

      await service.removeFromRoster(SPORT_ID, STUDENT_ID, COACH_ID, false);

      expect(enrollmentRepo.remove).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when no enrollment exists for that student', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());
      enrollmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.removeFromRoster(SPORT_ID, STUDENT_ID, COACH_ID, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a non-coach, non-privileged caller', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await expect(
        service.removeFromRoster(SPORT_ID, STUDENT_ID, 'someone-else', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRoster', () => {
    it('returns only active students, excluding graduated/withdrawn enrollment rows', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());
      enrollmentRepo.find!.mockResolvedValue([
        {
          studentId: 'active-student',
          enrolledAt: new Date('2026-01-20'),
          student: { firstName: 'A', lastName: 'One', admissionNumber: 'A1', status: StudentStatus.ACTIVE },
        },
        {
          studentId: 'withdrawn-student',
          enrolledAt: new Date('2026-01-21'),
          student: { firstName: 'B', lastName: 'Two', admissionNumber: 'A2', status: StudentStatus.WITHDRAWN },
        },
      ]);

      const result = await service.getRoster(SPORT_ID, COACH_ID, false);

      expect(result.roster).toHaveLength(1);
      expect(result.roster[0].studentId).toBe('active-student');
    });

    it('throws NotFoundException for an unknown sport', async () => {
      sportRepo.findOne!.mockResolvedValue(null);

      await expect(service.getRoster('missing-sport', COACH_ID, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for a non-coach, non-privileged caller — the explicitly-requested test (FR-P3-AV-03/04)', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await expect(service.getRoster(SPORT_ID, 'some-other-staff-id', false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getDirectory', () => {
    it('returns each sport with its coach and roster count', async () => {
      sportRepo.find!.mockResolvedValue([
        makeSport({ id: 'sport-1', name: 'Cricket', coach: { id: COACH_ID, firstName: 'Coach', lastName: 'One' } as StaffEntity }),
        makeSport({ id: 'sport-2', name: 'Football', coach: { id: COACH_ID, firstName: 'Coach', lastName: 'One' } as StaffEntity }),
      ]);
      const getRawMany = jest.fn().mockResolvedValue([
        { sportId: 'sport-1', count: '5' },
        { sportId: 'sport-2', count: '0' },
      ]);
      (enrollmentRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany,
      });

      const result = await service.getDirectory();

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.id === 'sport-1')?.rosterCount).toBe(5);
      expect(result.find((r) => r.id === 'sport-2')?.rosterCount).toBe(0);
      expect(result.find((r) => r.id === 'sport-1')?.coach).toEqual({
        id: COACH_ID,
        firstName: 'Coach',
        lastName: 'One',
      });
    });

    it('returns an empty array when there are no sports', async () => {
      sportRepo.find!.mockResolvedValue([]);

      const result = await service.getDirectory();

      expect(result).toEqual([]);
      expect(enrollmentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findByCoach — the coach-discovery gap this story closes for FR-P3-AV-03', () => {
    it('queries only sports where coachId matches the given staffId', async () => {
      sportRepo.find!.mockResolvedValue([makeSport()]);

      const result = await service.findByCoach(COACH_ID);

      expect(sportRepo.find).toHaveBeenCalledWith({
        where: { coachId: COACH_ID },
        order: { name: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });

    it('returns an empty array when the staff member coaches nothing', async () => {
      sportRepo.find!.mockResolvedValue([]);

      const result = await service.findByCoach('someone-else');

      expect(result).toEqual([]);
    });
  });

  describe('createMatch', () => {
    beforeEach(() => {
      sportRepo.findOne!.mockResolvedValue(makeSport());
    });

    it('a Coach can only create matches for their own assigned sport — the explicitly-requested test', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport({ id: OTHER_SPORT_ID, coachId: 'a-different-coach' }));

      await expect(
        service.createMatch(OTHER_SPORT_ID, makeMatchDto(), COACH_ID, false),
      ).rejects.toThrow(ForbiddenException);
      expect(matchRepo.save).not.toHaveBeenCalled();
    });

    it('succeeds for the coach actually assigned to that sport', async () => {
      await service.createMatch(SPORT_ID, makeMatchDto(), COACH_ID, false);

      expect(matchRepo.save).toHaveBeenCalledTimes(1);
    });

    it('allows Admin/Principal to create a match for any sport regardless of coach', async () => {
      await service.createMatch(SPORT_ID, makeMatchDto(), 'principal-uuid', true);

      expect(matchRepo.save).toHaveBeenCalledTimes(1);
    });

    it('denies Section Head (isMatchManager=false, not the coach) — the real asymmetry from roster access', async () => {
      await expect(
        service.createMatch(SPORT_ID, makeMatchDto(), 'section-head-uuid', false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('defaults teamResult to NO_RESULT when omitted', async () => {
      await service.createMatch(SPORT_ID, makeMatchDto(), COACH_ID, false);

      expect(matchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ teamResult: TeamResult.NO_RESULT }),
      );
    });

    it('uses the given teamResult when provided', async () => {
      await service.createMatch(SPORT_ID, makeMatchDto({ teamResult: TeamResult.WIN }), COACH_ID, false);

      expect(matchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ teamResult: TeamResult.WIN }),
      );
    });

    it('rejects an invalid matchType', async () => {
      const dto = makeMatchDto({ matchType: 'not_a_real_type' as MatchType });

      await expect(service.createMatch(SPORT_ID, dto, COACH_ID, false)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(matchRepo.save).not.toHaveBeenCalled();
    });

    it('records loggedByStaffId as the caller', async () => {
      await service.createMatch(SPORT_ID, makeMatchDto(), COACH_ID, false);

      expect(matchRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ loggedByStaffId: COACH_ID }),
      );
    });
  });

  describe('updateMatch', () => {
    const makeMatch = (overrides: Partial<MatchEntity> = {}): MatchEntity =>
      ({
        id: MATCH_ID,
        sportId: SPORT_ID,
        date: new Date('2026-08-15'),
        opponent: 'Royal College',
        venue: 'Home Ground',
        matchType: MatchType.FRIENDLY,
        teamResult: TeamResult.NO_RESULT,
        teamScore: null,
        notes: null,
        loggedByStaffId: COACH_ID,
        ...overrides,
      } as MatchEntity);

    beforeEach(() => {
      matchRepo.findOne!.mockResolvedValue(makeMatch());
      sportRepo.findOne!.mockResolvedValue(makeSport());
    });

    it('applies a partial update as the assigned coach', async () => {
      await service.updateMatch(MATCH_ID, { teamResult: TeamResult.WIN, teamScore: '2-1' }, COACH_ID, false);

      expect(matchRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ teamResult: TeamResult.WIN, teamScore: '2-1' }),
      );
    });

    it('throws NotFoundException for an unknown match', async () => {
      matchRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateMatch('missing-match', { teamScore: '1-0' }, COACH_ID, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a coach who does not own the match\'s sport', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport({ coachId: 'a-different-coach' }));

      await expect(
        service.updateMatch(MATCH_ID, { teamScore: '1-0' }, COACH_ID, false),
      ).rejects.toThrow(ForbiddenException);
      expect(matchRepo.save).not.toHaveBeenCalled();
    });

    it('allows Admin/Principal to edit any match', async () => {
      await service.updateMatch(MATCH_ID, { teamScore: '3-0' }, 'admin-uuid', true);

      expect(matchRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('findMatches', () => {
    it('returns matches ordered by date DESC as the assigned coach', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await service.findMatches(SPORT_ID, COACH_ID, false);

      expect(matchRepo.find).toHaveBeenCalledWith({
        where: { sportId: SPORT_ID },
        order: { date: 'DESC' },
      });
    });

    it('allows Section Head to view (broader view-access rule than match management)', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await expect(service.findMatches(SPORT_ID, 'section-head-uuid', true)).resolves.toBeDefined();
    });

    it('throws ForbiddenException for a non-coach, non-privileged caller', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await expect(service.findMatches(SPORT_ID, 'someone-else', false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createTrainingSession', () => {
    beforeEach(() => {
      sportRepo.findOne!.mockResolvedValue(makeSport());
    });

    it('creates a training session as the assigned coach', async () => {
      await service.createTrainingSession(SPORT_ID, makeTrainingSessionDto(), COACH_ID, false);

      expect(trainingSessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws ForbiddenException for a coach not assigned to this sport', async () => {
      await expect(
        service.createTrainingSession(SPORT_ID, makeTrainingSessionDto(), 'someone-else', false),
      ).rejects.toThrow(ForbiddenException);
      expect(trainingSessionRepo.save).not.toHaveBeenCalled();
    });

    it('allows Admin/Principal to log a session for any sport', async () => {
      await service.createTrainingSession(SPORT_ID, makeTrainingSessionDto(), 'admin-uuid', true);

      expect(trainingSessionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects an attendee who is not enrolled on the sport roster', async () => {
      const dto = makeTrainingSessionDto({ attendeeStudentIds: ['not-enrolled-student'] });

      await expect(
        service.createTrainingSession(SPORT_ID, dto, COACH_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(trainingSessionRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a session leader who is not among the attendees', async () => {
      enrollmentRepo.find!.mockResolvedValue([
        { sportId: SPORT_ID, studentId: STUDENT_ID },
        { sportId: SPORT_ID, studentId: 'other-enrolled-student' },
      ]);
      const dto = makeTrainingSessionDto({
        attendeeStudentIds: [STUDENT_ID],
        sessionLeaderStudentId: 'other-enrolled-student',
      });

      await expect(
        service.createTrainingSession(SPORT_ID, dto, COACH_ID, false),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(trainingSessionRepo.save).not.toHaveBeenCalled();
    });

    it('accepts a session leader who is both enrolled and an attendee', async () => {
      const dto = makeTrainingSessionDto({
        attendeeStudentIds: [STUDENT_ID],
        sessionLeaderStudentId: STUDENT_ID,
      });

      await service.createTrainingSession(SPORT_ID, dto, COACH_ID, false);

      expect(trainingSessionRepo.save).toHaveBeenCalledTimes(1);
      expect(trainingSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sessionLeaderStudentId: STUDENT_ID }),
      );
    });
  });

  describe('updateTrainingSession', () => {
    const SESSION_ID = 'session-uuid';
    const makeSession = () =>
      ({
        id: SESSION_ID,
        sportId: SPORT_ID,
        date: new Date('2026-08-10'),
        description: 'Original notes',
        attendeeStudentIds: [STUDENT_ID],
        sessionLeaderStudentId: null,
        loggedByStaffId: COACH_ID,
      }) as TrainingSessionEntity;

    beforeEach(() => {
      trainingSessionRepo.findOne!.mockResolvedValue(makeSession());
      sportRepo.findOne!.mockResolvedValue(makeSport());
    });

    it('applies a partial update as the assigned coach', async () => {
      await service.updateTrainingSession(SESSION_ID, { description: 'Updated notes' }, COACH_ID, false);

      expect(trainingSessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Updated notes' }),
      );
    });

    it('throws NotFoundException for an unknown session', async () => {
      trainingSessionRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateTrainingSession('missing', { description: 'x' }, COACH_ID, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for a coach who does not own the session\'s sport', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport({ coachId: 'a-different-coach' }));

      await expect(
        service.updateTrainingSession(SESSION_ID, { description: 'x' }, COACH_ID, false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findTrainingSessions', () => {
    it('returns sessions ordered by date DESC as the assigned coach', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await service.findTrainingSessions(SPORT_ID, COACH_ID, false);

      expect(trainingSessionRepo.find).toHaveBeenCalledWith({
        where: { sportId: SPORT_ID },
        order: { date: 'DESC' },
      });
    });

    it('allows Section Head to view', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await expect(
        service.findTrainingSessions(SPORT_ID, 'section-head-uuid', true),
      ).resolves.toBeDefined();
    });

    it('throws ForbiddenException for a non-coach, non-privileged caller', async () => {
      sportRepo.findOne!.mockResolvedValue(makeSport());

      await expect(service.findTrainingSessions(SPORT_ID, 'someone-else', false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll — Section-Head grade-range filtering (FR-P3-AV-02, the explicitly-requested test)', () => {
    const SECTION_HEAD_ID = 'section-head-uuid';

    const setupQueryBuilder = (rows: { sportId: string }[]) => {
      const getRawMany = jest.fn().mockResolvedValue(rows);
      (enrollmentRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany,
      });
    };

    it('returns every sport, unfiltered, for a fully privileged caller', async () => {
      sportRepo.find!.mockResolvedValue([makeSport({ id: 'sport-1' }), makeSport({ id: 'sport-2' })]);

      const result = await service.findAll('admin-staff-id', true, false);

      expect(result).toHaveLength(2);
      expect(staffRepo.findOne).not.toHaveBeenCalled();
    });

    it('returns [] for a Section Head with no configured grade range — fail-closed, never unfiltered', async () => {
      staffRepo.findOne!.mockResolvedValue({ id: SECTION_HEAD_ID, sectionHeadGradeFrom: null, sectionHeadGradeTo: null });
      sportRepo.find!.mockResolvedValue([makeSport({ id: 'sport-1' })]);

      const result = await service.findAll(SECTION_HEAD_ID, false, true);

      expect(result).toEqual([]);
    });

    it('filters the sport list to only sports with an active enrolled student in the Section Head\'s grade range', async () => {
      staffRepo.findOne!.mockResolvedValue({ id: SECTION_HEAD_ID, sectionHeadGradeFrom: 6, sectionHeadGradeTo: 9 });
      sportRepo.find!.mockResolvedValue([
        makeSport({ id: 'sport-1', name: 'Cricket' }),
        makeSport({ id: 'sport-2', name: 'Chess' }),
      ]);
      setupQueryBuilder([{ sportId: 'sport-1' }]);

      const result = await service.findAll(SECTION_HEAD_ID, false, true);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sport-1');
    });

    it('returns [] for a caller that is neither fully privileged nor a Section Head', async () => {
      sportRepo.find!.mockResolvedValue([makeSport()]);

      const result = await service.findAll('some-teacher-id', false, false);

      expect(result).toEqual([]);
    });
  });

  describe('isSportViewableBySectionHead (FR-P3-AV-02)', () => {
    const SECTION_HEAD_ID = 'section-head-uuid';

    const setupQueryBuilder = (match: unknown) => {
      const getOne = jest.fn().mockResolvedValue(match);
      (enrollmentRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne,
      });
    };

    it('returns false when the Section Head has no configured grade range', async () => {
      staffRepo.findOne!.mockResolvedValue({ id: SECTION_HEAD_ID, sectionHeadGradeFrom: null, sectionHeadGradeTo: null });

      const result = await service.isSportViewableBySectionHead(SPORT_ID, SECTION_HEAD_ID);

      expect(result).toBe(false);
    });

    it('returns true when the sport has an active enrolled student inside the range', async () => {
      staffRepo.findOne!.mockResolvedValue({ id: SECTION_HEAD_ID, sectionHeadGradeFrom: 6, sectionHeadGradeTo: 9 });
      setupQueryBuilder({ id: 'enrollment-1' });

      const result = await service.isSportViewableBySectionHead(SPORT_ID, SECTION_HEAD_ID);

      expect(result).toBe(true);
    });

    it('returns false when the sport has no enrolled student inside the range', async () => {
      staffRepo.findOne!.mockResolvedValue({ id: SECTION_HEAD_ID, sectionHeadGradeFrom: 1, sectionHeadGradeTo: 5 });
      setupQueryBuilder(null);

      const result = await service.isSportViewableBySectionHead(SPORT_ID, SECTION_HEAD_ID);

      expect(result).toBe(false);
    });
  });
});
