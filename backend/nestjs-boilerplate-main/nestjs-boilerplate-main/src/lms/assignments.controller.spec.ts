import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { SubmissionsService } from './submissions.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { RoleEnum } from '../roles/roles.enum';

describe('AssignmentsController — student self-resolution (class-scoping IDOR safety)', () => {
  let controller: AssignmentsController;
  let studentRepo: { findOne: jest.Mock };
  let guardianRepo: { findOne: jest.Mock };
  let sgRepo: { find: jest.Mock };
  let assignmentsService: {
    findForClassSection: jest.Mock;
    findMine: jest.Mock;
    create: jest.Mock;
  };
  let submissionsService: {
    getStatusesForStudent: jest.Mock;
    getRosterForAssignment: jest.Mock;
    getForGuardianChild: jest.Mock;
  };
  let usersService: { findById: jest.Mock };
  let staffService: { findByEmail: jest.Mock };

  const makeReq = (roleId: number, userId: number = 1) => ({
    user: { id: userId, role: { id: roleId } },
  });

  beforeEach(async () => {
    studentRepo = { findOne: jest.fn() };
    guardianRepo = { findOne: jest.fn() };
    sgRepo = { find: jest.fn() };
    assignmentsService = {
      findForClassSection: jest.fn(),
      findMine: jest.fn(),
      create: jest.fn(),
    };
    submissionsService = {
      getStatusesForStudent: jest.fn(),
      getRosterForAssignment: jest.fn(),
      getForGuardianChild: jest.fn(),
    };
    usersService = { findById: jest.fn() };
    staffService = { findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        { provide: AssignmentsService, useValue: assignmentsService },
        { provide: SubmissionsService, useValue: submissionsService },
        { provide: UsersService, useValue: usersService },
        { provide: StaffService, useValue: staffService },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
  });

  describe('GET /lms/assignments/my-class', () => {
    it("resolves the caller's own classSectionId from their StudentEntity — there is no client-supplied id to pass", async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-1', classSectionId: 7 });
      assignmentsService.findForClassSection.mockResolvedValue([{ id: 'a-1' }]);

      const req = makeReq(RoleEnum.student, 42);
      await controller.findForMyClass(req);

      expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
      expect(assignmentsService.findForClassSection).toHaveBeenCalledWith(7);
    });

    it('throws NotFoundException when the caller has no linked student record', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(controller.findForMyClass(makeReq(RoleEnum.student, 99))).rejects.toThrow(
        NotFoundException,
      );
      expect(assignmentsService.findForClassSection).not.toHaveBeenCalled();
    });

    it('resolves a different classSectionId for a different caller — proving no cross-class leakage via a shared code path', async () => {
      studentRepo.findOne.mockResolvedValueOnce({ id: 'student-1', classSectionId: 1 });
      await controller.findForMyClass(makeReq(RoleEnum.student, 1));
      expect(assignmentsService.findForClassSection).toHaveBeenLastCalledWith(1);

      studentRepo.findOne.mockResolvedValueOnce({ id: 'student-2', classSectionId: 2 });
      await controller.findForMyClass(makeReq(RoleEnum.student, 2));
      expect(assignmentsService.findForClassSection).toHaveBeenLastCalledWith(2);
    });
  });

  describe('GET /lms/assignments/submissions/statuses', () => {
    it("resolves the caller's own classSectionId/studentId and passes both to the service", async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-1', classSectionId: 7 });
      submissionsService.getStatusesForStudent.mockResolvedValue([]);

      await controller.findSubmissionStatuses(makeReq(RoleEnum.student, 42));

      expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { userId: 42 } });
      expect(submissionsService.getStatusesForStudent).toHaveBeenCalledWith(7, 'student-1');
    });

    it('throws NotFoundException when the caller has no linked student record', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.findSubmissionStatuses(makeReq(RoleEnum.student, 99)),
      ).rejects.toThrow(NotFoundException);
      expect(submissionsService.getStatusesForStudent).not.toHaveBeenCalled();
    });
  });

  describe('GET /lms/assignments/mine', () => {
    it("resolves the caller's own staffId via resolveStaffId and passes it to the service", async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      assignmentsService.findMine.mockResolvedValue([]);

      await controller.findMine(makeReq(RoleEnum.teacher, 10));

      expect(assignmentsService.findMine).toHaveBeenCalledWith('staff-1');
    });
  });

  describe('POST /lms/assignments', () => {
    it('resolves staffId and privilege flag, passing both through to the service', async () => {
      usersService.findById.mockResolvedValue({ email: 'sectionhead@sims.edu.lk' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-2' });
      assignmentsService.create.mockResolvedValue({ id: 'assignment-1' });

      const dto = {
        classSectionId: 1,
        subjectId: 'subj-1',
        title: 't',
        instructions: 'i',
        dueDate: '2026-08-01',
      };
      await controller.create(dto as any, makeReq(RoleEnum.section_head, 20));

      expect(assignmentsService.create).toHaveBeenCalledWith(dto, 'staff-2', true);
    });
  });

  describe('GET /lms/assignments/:assignmentId/roster', () => {
    it("resolves the caller's own staffId and privilege flag, passing both to the service", async () => {
      usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
      staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
      submissionsService.getRosterForAssignment.mockResolvedValue({ assignment: {}, roster: [] });

      await controller.getRoster('assignment-1', makeReq(RoleEnum.teacher, 10));

      expect(submissionsService.getRosterForAssignment).toHaveBeenCalledWith(
        'assignment-1',
        'staff-1',
        false,
      );
    });
  });

  describe('GET /lms/assignments/guardian/:studentId', () => {
    it("resolves the caller's own linked children and allows a request for one of them", async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
      sgRepo.find.mockResolvedValue([{ studentId: 'my-child-id', guardianId: 'guardian-1' }]);
      studentRepo.findOne.mockResolvedValue({ id: 'my-child-id', classSectionId: 3 });
      submissionsService.getForGuardianChild.mockResolvedValue([]);

      await controller.findForGuardianChild('my-child-id', makeReq(RoleEnum.guardian, 5));

      expect(submissionsService.getForGuardianChild).toHaveBeenCalledWith('my-child-id', 3);
    });

    it('throws ForbiddenException when the requested student is not one of the caller\'s linked children', async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
      sgRepo.find.mockResolvedValue([{ studentId: 'someone-elses-child', guardianId: 'guardian-1' }]);

      await expect(
        controller.findForGuardianChild('not-my-child', makeReq(RoleEnum.guardian, 5)),
      ).rejects.toThrow(ForbiddenException);
      expect(submissionsService.getForGuardianChild).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the caller has no linked guardian record', async () => {
      guardianRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.findForGuardianChild('some-child', makeReq(RoleEnum.guardian, 5)),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
