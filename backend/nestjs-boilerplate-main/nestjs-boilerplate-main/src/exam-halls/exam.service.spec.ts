import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ExamService } from './exam.service';
import { ExamEntity, ExamType } from './entities/exam.entity';
import { StaffEntity } from '../staff/entities/staff.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'generated', ...(d as object) })),
});

const STAFF_ID = 'staff-1';

describe('ExamService', () => {
  let service: ExamService;
  let examRepo: MockRepo<ExamEntity>;
  let staffRepo: MockRepo<StaffEntity>;

  beforeEach(async () => {
    examRepo = repoMock<ExamEntity>();
    staffRepo = repoMock<StaffEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: getRepositoryToken(ExamEntity), useValue: examRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
      ],
    }).compile();

    service = module.get(ExamService);
  });

  describe('create — Section Head grade-range guard', () => {
    it('allows a fully privileged caller (admin/principal) regardless of grade', async () => {
      const dto = { name: 'Term Test', examType: ExamType.TERM_TEST, subjectId: 'subj-1', gradeId: 3, date: '2026-05-01', startTime: '09:00', endTime: '11:00', academicYear: '2026' };
      await service.create(dto, STAFF_ID, true, false);
      expect(examRepo.save).toHaveBeenCalled();
      expect(staffRepo.findOne).not.toHaveBeenCalled();
    });

    it('allows a section head whose configured grade range covers the exam grade', async () => {
      (staffRepo.findOne as jest.Mock).mockResolvedValue({ sectionHeadGradeFrom: 10, sectionHeadGradeTo: 11 });
      const dto = { name: 'O/L', examType: ExamType.O_LEVEL, subjectId: 'subj-1', gradeId: 11, date: '2026-12-05', startTime: '08:30', endTime: '11:30', academicYear: '2026' };
      await expect(service.create(dto, STAFF_ID, false, true)).resolves.toBeDefined();
    });

    it('rejects a section head whose grade range does not cover the exam grade', async () => {
      (staffRepo.findOne as jest.Mock).mockResolvedValue({ sectionHeadGradeFrom: 1, sectionHeadGradeTo: 5 });
      const dto = { name: 'O/L', examType: ExamType.O_LEVEL, subjectId: 'subj-1', gradeId: 11, date: '2026-12-05', startTime: '08:30', endTime: '11:30', academicYear: '2026' };
      await expect(service.create(dto, STAFF_ID, false, true)).rejects.toThrow(ForbiddenException);
    });

    it('fails closed when the section head has no configured grade range', async () => {
      (staffRepo.findOne as jest.Mock).mockResolvedValue({ sectionHeadGradeFrom: null, sectionHeadGradeTo: null });
      const dto = { name: 'O/L', examType: ExamType.O_LEVEL, subjectId: 'subj-1', gradeId: 11, date: '2026-12-05', startTime: '08:30', endTime: '11:30', academicYear: '2026' };
      await expect(service.create(dto, STAFF_ID, false, true)).rejects.toThrow(ForbiddenException);
    });

    it('rejects a caller who is neither fully privileged nor a section head', async () => {
      const dto = { name: 'O/L', examType: ExamType.O_LEVEL, subjectId: 'subj-1', gradeId: 11, date: '2026-12-05', startTime: '08:30', endTime: '11:30', academicYear: '2026' };
      await expect(service.create(dto, STAFF_ID, false, false)).rejects.toThrow(ForbiddenException);
    });
  });
});
