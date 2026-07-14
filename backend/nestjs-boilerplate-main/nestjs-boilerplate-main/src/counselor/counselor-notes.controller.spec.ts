import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CounselorNotesController } from './counselor-notes.controller';
import { CounselorNoteService } from './counselor-note.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';

describe('CounselorNotesController — guardian ownership guarantee', () => {
  let controller: CounselorNotesController;
  let guardianRepo: { findOne: jest.Mock };
  let sgRepo: { find: jest.Mock };
  let noteService: { findApprovedSummariesForGuardian: jest.Mock };

  const makeReq = (userId: unknown = 9) => ({ user: { id: userId } });

  beforeEach(async () => {
    guardianRepo = { findOne: jest.fn() };
    sgRepo = { find: jest.fn() };
    noteService = { findApprovedSummariesForGuardian: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CounselorNotesController],
      providers: [
        { provide: CounselorNoteService, useValue: noteService },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: StaffService, useValue: { findByEmail: jest.fn() } },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
      ],
    }).compile();

    controller = module.get<CounselorNotesController>(CounselorNotesController);
  });

  it('throws 404 when the caller has no linked guardian record', async () => {
    guardianRepo.findOne.mockResolvedValue(null);

    await expect(
      controller.findApprovedSummariesForGuardian('some-student-id', makeReq()),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws 403 when the requested studentId is not one of the guardian\'s own children', async () => {
    guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
    sgRepo.find.mockResolvedValue([{ studentId: 'my-actual-child-id' }]);

    await expect(
      controller.findApprovedSummariesForGuardian('not-my-child', makeReq()),
    ).rejects.toThrow(ForbiddenException);
    expect(noteService.findApprovedSummariesForGuardian).not.toHaveBeenCalled();
  });

  it('allows the request and delegates to the service when the student is genuinely the guardian\'s own child', async () => {
    guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
    sgRepo.find.mockResolvedValue([{ studentId: 'my-actual-child-id' }]);
    noteService.findApprovedSummariesForGuardian.mockResolvedValue([
      { id: 'note-1', studentId: 'my-actual-child-id', approvedSummary: 'Shared update.', createdAt: new Date() },
    ]);

    const result = await controller.findApprovedSummariesForGuardian('my-actual-child-id', makeReq());

    expect(noteService.findApprovedSummariesForGuardian).toHaveBeenCalledWith('my-actual-child-id');
    expect(result).toHaveLength(1);
  });
});
