import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { EventParticipantService } from './event-participant.service';
import { EventStudentParticipantEntity } from './entities/event-student-participant.entity';
import { EventStudentAttendanceEntity, EventStudentAttendanceMethod } from './entities/event-student-attendance.entity';
import { StudentEntity, StudentStatus } from '../students/entities/student.entity';
import { ClassSectionEntity } from '../students/entities/class-section.entity';
import { AuditService } from '../audit/audit.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve(Array.isArray(d) ? d : { id: 'generated-id', ...(d as object) })),
});

const EVENT_ID = 'event-1';
const TEACHER_ID = 'teacher-1';
const CLASS_SECTION_ID = 10;

function buildStudent(overrides: Partial<StudentEntity> = {}): StudentEntity {
  return {
    id: 'student-1',
    firstName: 'Nimal',
    lastName: 'Perera',
    classSectionId: CLASS_SECTION_ID,
    status: StudentStatus.ACTIVE,
    ...overrides,
  } as StudentEntity;
}

function buildParticipant(overrides: Partial<EventStudentParticipantEntity> = {}): EventStudentParticipantEntity {
  return {
    id: 'participant-1',
    eventId: EVENT_ID,
    studentId: 'student-1',
    addedByStaffId: 'staff-1',
    qrCode: 'data:image/png;base64,x',
    issuedAt: new Date(),
    ...overrides,
  } as EventStudentParticipantEntity;
}

describe('EventParticipantService', () => {
  let service: EventParticipantService;
  let participantRepo: MockRepo<EventStudentParticipantEntity>;
  let studentAttendanceRepo: MockRepo<EventStudentAttendanceEntity>;
  let studentRepo: MockRepo<StudentEntity>;
  let classSectionRepo: MockRepo<ClassSectionEntity>;
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    participantRepo = repoMock<EventStudentParticipantEntity>();
    studentAttendanceRepo = repoMock<EventStudentAttendanceEntity>();
    studentRepo = repoMock<StudentEntity>();
    classSectionRepo = repoMock<ClassSectionEntity>();
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventParticipantService,
        { provide: getRepositoryToken(EventStudentParticipantEntity), useValue: participantRepo },
        { provide: getRepositoryToken(EventStudentAttendanceEntity), useValue: studentAttendanceRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(ClassSectionEntity), useValue: classSectionRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(EventParticipantService);
  });

  describe('addParticipants', () => {
    it('throws when neither classSectionIds nor studentIds are provided', async () => {
      await expect(service.addParticipants(EVENT_ID, {}, 'staff-1')).rejects.toThrow(BadRequestException);
    });

    it('resolves a class section to its active students, dedupes against explicit studentIds, and audit-logs once', async () => {
      (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent({ id: 'student-1' }), buildStudent({ id: 'student-2' })]);
      (participantRepo.find as jest.Mock).mockResolvedValue([]); // none already added

      const created = await service.addParticipants(
        EVENT_ID,
        { classSectionIds: [CLASS_SECTION_ID], studentIds: ['student-1', 'student-3'] },
        'staff-1',
      );

      // student-1 appears in both the class roster and the explicit list — deduped to one row
      const createdStudentIds = created.map((p) => p.studentId).sort();
      expect(createdStudentIds).toEqual(['student-1', 'student-2', 'student-3'].sort());
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'staff-1', action: 'add_participants', targetType: 'event', targetId: EVENT_ID }),
      );
    });

    it('skips students who are already participants and does not audit-log when nothing new was added', async () => {
      (participantRepo.find as jest.Mock).mockResolvedValue([buildParticipant({ studentId: 'student-1' })]);

      const created = await service.addParticipants(EVENT_ID, { studentIds: ['student-1'] }, 'staff-1');

      expect(created).toEqual([]);
      expect(auditService.log).not.toHaveBeenCalled();
    });
  });

  describe('classTeacherBulkCheckIn', () => {
    it('throws Forbidden when the caller is not this section\'s class teacher', async () => {
      (classSectionRepo.findOne as jest.Mock).mockResolvedValue({ id: CLASS_SECTION_ID, classTeacherStaffId: 'someone-else' });

      await expect(service.classTeacherBulkCheckIn(EVENT_ID, CLASS_SECTION_ID, TEACHER_ID)).rejects.toThrow(ForbiddenException);
      expect(studentAttendanceRepo.save).not.toHaveBeenCalled();
    });

    it('bulk-marks every participant in the class who has not already been checked in', async () => {
      (classSectionRepo.findOne as jest.Mock).mockResolvedValue({ id: CLASS_SECTION_ID, classTeacherStaffId: TEACHER_ID });
      (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent({ id: 's1' }), buildStudent({ id: 's2' })]);
      (participantRepo.find as jest.Mock).mockResolvedValue([
        buildParticipant({ id: 'p1', studentId: 's1' }),
        buildParticipant({ id: 'p2', studentId: 's2' }),
      ]);
      (studentAttendanceRepo.find as jest.Mock).mockResolvedValue([
        { id: 'att-1', eventStudentParticipantId: 'p1' }, // p1 already checked in
      ]);

      const count = await service.classTeacherBulkCheckIn(EVENT_ID, CLASS_SECTION_ID, TEACHER_ID);

      expect(count).toBe(1);
      expect(studentAttendanceRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ eventStudentParticipantId: 'p2', method: EventStudentAttendanceMethod.CLASS_TEACHER_BULK }),
      ]);
    });

    it('is idempotent — a re-run with everyone already checked in creates no new rows', async () => {
      (classSectionRepo.findOne as jest.Mock).mockResolvedValue({ id: CLASS_SECTION_ID, classTeacherStaffId: TEACHER_ID });
      (studentRepo.find as jest.Mock).mockResolvedValue([buildStudent({ id: 's1' })]);
      (participantRepo.find as jest.Mock).mockResolvedValue([buildParticipant({ id: 'p1', studentId: 's1' })]);
      (studentAttendanceRepo.find as jest.Mock).mockResolvedValue([{ id: 'att-1', eventStudentParticipantId: 'p1' }]);

      const count = await service.classTeacherBulkCheckIn(EVENT_ID, CLASS_SECTION_ID, TEACHER_ID);

      expect(count).toBe(0);
      expect(studentAttendanceRepo.save).not.toHaveBeenCalled();
    });
  });
});
