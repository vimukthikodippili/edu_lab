import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentNotesService } from './student-notes.service';
import { StudentYearEndNoteEntity } from './entities/student-year-end-note.entity';
import { StudentEntity } from '../students/entities/student.entity';

const STUDENT_ID = 'student-uuid';
const CLASS_TEACHER_ID = 'class-teacher-uuid';
const OTHER_TEACHER_ID = 'other-teacher-uuid';

const makeStudent = (classTeacherStaffId: string | null = CLASS_TEACHER_ID) =>
  ({
    id: STUDENT_ID,
    classSection: { id: 1, classTeacherStaffId },
  }) as unknown as StudentEntity;

describe('StudentNotesService', () => {
  let service: StudentNotesService;
  let noteRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let studentRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    noteRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    studentRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentNotesService,
        { provide: getRepositoryToken(StudentYearEndNoteEntity), useValue: noteRepo },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    service = module.get<StudentNotesService>(StudentNotesService);
  });

  describe('upsertNote', () => {
    const dto = {
      academicYear: '2026',
      position: 'Head Prefect',
      extracurricularActivities: 'Debate team captain',
      generalRemarks: 'Excellent leadership',
    };

    it('throws NotFoundException when the student does not exist', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.upsertNote(STUDENT_ID, CLASS_TEACHER_ID, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is not the class teacher', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent(CLASS_TEACHER_ID));

      await expect(
        service.upsertNote(STUDENT_ID, OTHER_TEACHER_ID, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a new note when none exists for the year', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent(CLASS_TEACHER_ID));
      noteRepo.findOne.mockResolvedValue(null);

      const result = await service.upsertNote(STUDENT_ID, CLASS_TEACHER_ID, dto);

      expect(noteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: STUDENT_ID,
          academicYear: '2026',
          classTeacherStaffId: CLASS_TEACHER_ID,
          position: 'Head Prefect',
        }),
      );
      expect(result).toEqual(expect.objectContaining({ academicYear: '2026' }));
    });

    it('updates the existing note for the same student+year instead of creating a duplicate', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent(CLASS_TEACHER_ID));
      const existing = {
        id: 'note-1',
        studentId: STUDENT_ID,
        academicYear: '2026',
        position: 'Old position',
      };
      noteRepo.findOne.mockResolvedValue(existing);

      const result = await service.upsertNote(STUDENT_ID, CLASS_TEACHER_ID, dto);

      expect(noteRepo.create).not.toHaveBeenCalled();
      expect(result.position).toBe('Head Prefect');
    });
  });

  describe('getNotesForStudent', () => {
    it('returns notes for a privileged requester (null staffId) without an ownership check', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent(CLASS_TEACHER_ID));
      noteRepo.find.mockResolvedValue([{ id: 'note-1' }]);

      const result = await service.getNotesForStudent(STUDENT_ID, null);

      expect(result).toEqual([{ id: 'note-1' }]);
    });

    it('rejects a teacher requester who is not the class teacher', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent(CLASS_TEACHER_ID));

      await expect(
        service.getNotesForStudent(STUDENT_ID, OTHER_TEACHER_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the class teacher to read notes for their own student', async () => {
      studentRepo.findOne.mockResolvedValue(makeStudent(CLASS_TEACHER_ID));
      noteRepo.find.mockResolvedValue([{ id: 'note-1' }]);

      const result = await service.getNotesForStudent(STUDENT_ID, CLASS_TEACHER_ID);

      expect(result).toEqual([{ id: 'note-1' }]);
    });
  });
});
