import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentEntity } from '../students/entities/student.entity';
import { RoleEnum } from '../roles/roles.enum';

describe('SubmissionsController — student self-resolution (IDOR safety)', () => {
  let controller: SubmissionsController;
  let studentRepo: { findOne: jest.Mock };
  let submissionsService: { submit: jest.Mock; findMineForAssignment: jest.Mock; grade: jest.Mock };
  let usersService: { findById: jest.Mock };
  let staffService: { findByEmail: jest.Mock };

  const makeReq = (roleId: number, userId: number = 1) => ({
    user: { id: userId, role: { id: roleId } },
  });

  beforeEach(async () => {
    studentRepo = { findOne: jest.fn() };
    submissionsService = { submit: jest.fn(), findMineForAssignment: jest.fn(), grade: jest.fn() };
    usersService = { findById: jest.fn() };
    staffService = { findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        { provide: SubmissionsService, useValue: submissionsService },
        { provide: UsersService, useValue: usersService },
        { provide: StaffService, useValue: staffService },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  describe('POST /lms/assignments/:assignmentId/submissions', () => {
    it("resolves the caller's own studentId/classSectionId — there is no studentId field on the DTO to forge", async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-1', classSectionId: 7 });
      submissionsService.submit.mockResolvedValue({ id: 'submission-1' });

      const dto = { textContent: 'done' };
      await controller.submit('assignment-1', dto as any, makeReq(RoleEnum.student, 42));

      expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
      expect(submissionsService.submit).toHaveBeenCalledWith('assignment-1', 'student-1', 7, dto);
    });

    it('throws NotFoundException when the caller has no linked student record', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.submit('assignment-1', {} as any, makeReq(RoleEnum.student, 99)),
      ).rejects.toThrow(NotFoundException);
      expect(submissionsService.submit).not.toHaveBeenCalled();
    });

    it('resolves a different studentId for a different caller — proving no cross-student leakage via a shared code path', async () => {
      studentRepo.findOne.mockResolvedValueOnce({ id: 'student-1', classSectionId: 1 });
      await controller.submit('assignment-1', { textContent: 'a' } as any, makeReq(RoleEnum.student, 1));
      expect(submissionsService.submit).toHaveBeenLastCalledWith('assignment-1', 'student-1', 1, { textContent: 'a' });

      studentRepo.findOne.mockResolvedValueOnce({ id: 'student-2', classSectionId: 2 });
      await controller.submit('assignment-1', { textContent: 'b' } as any, makeReq(RoleEnum.student, 2));
      expect(submissionsService.submit).toHaveBeenLastCalledWith('assignment-1', 'student-2', 2, { textContent: 'b' });
    });
  });

  describe('GET /lms/assignments/:assignmentId/submissions/me', () => {
    it("resolves the caller's own studentId and passes it to the service", async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-1', classSectionId: 7 });
      submissionsService.findMineForAssignment.mockResolvedValue(null);

      await controller.findMine('assignment-1', makeReq(RoleEnum.student, 42));

      expect(submissionsService.findMineForAssignment).toHaveBeenCalledWith('assignment-1', 'student-1');
    });
  });

  describe('PATCH /lms/assignments/:assignmentId/submissions/:submissionId/grade', () => {
    it("resolves the caller's own staffId and privilege flag, passing both to the service along with the submission/assignment ids", async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      submissionsService.grade.mockResolvedValue({ id: 'submission-1', grade: 'A' });

      const dto = { grade: 'A', feedback: 'Well done.' };
      await controller.grade('assignment-1', 'submission-1', dto as any, makeReq(RoleEnum.teacher, 10));

      expect(submissionsService.grade).toHaveBeenCalledWith(
        'submission-1',
        'assignment-1',
        'staff-1',
        false,
        dto,
      );
    });
  });
});
