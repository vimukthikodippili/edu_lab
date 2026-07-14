import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TeacherSubjectRequirementsController } from './teacher-subject-requirements.controller';
import { TeacherSubjectRequirementsService } from './teacher-subject-requirements.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';

describe('TeacherSubjectRequirementsController — GET /teacher-subject-requirements/mine', () => {
  let controller: TeacherSubjectRequirementsController;
  let svc: { findByTeacher: jest.Mock };
  let usersService: { findById: jest.Mock };
  let staffService: { findByEmail: jest.Mock };

  const makeReq = (roleId: number, userId: unknown = 1) => ({
    user: { id: userId, role: { id: roleId } },
  });

  beforeEach(async () => {
    svc = { findByTeacher: jest.fn() };
    usersService = { findById: jest.fn() };
    staffService = { findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherSubjectRequirementsController],
      providers: [
        { provide: TeacherSubjectRequirementsService, useValue: svc },
        { provide: UsersService, useValue: usersService },
        { provide: StaffService, useValue: staffService },
      ],
    }).compile();

    controller = module.get<TeacherSubjectRequirementsController>(
      TeacherSubjectRequirementsController,
    );
  });

  it("resolves the caller's own staffId via email lookup and passes it to the service", async () => {
    usersService.findById.mockResolvedValue({ email: 'teacher2@gmail.com' });
    staffService.findByEmail.mockResolvedValue({ id: 'staff-1' });
    svc.findByTeacher.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findMine(makeReq(RoleEnum.teacher, 10));

    expect(svc.findByTeacher).toHaveBeenCalledWith('staff-1');
    expect(result).toEqual([{ id: 1 }]);
  });

  it("returns a different teacher's own rows only — proving no cross-teacher leakage via a shared code path", async () => {
    usersService.findById.mockResolvedValueOnce({ email: 'teacher-a@sims.edu.lk' });
    staffService.findByEmail.mockResolvedValueOnce({ id: 'staff-a' });
    await controller.findMine(makeReq(RoleEnum.teacher, 1));
    expect(svc.findByTeacher).toHaveBeenLastCalledWith('staff-a');

    usersService.findById.mockResolvedValueOnce({ email: 'teacher-b@sims.edu.lk' });
    staffService.findByEmail.mockResolvedValueOnce({ id: 'staff-b' });
    await controller.findMine(makeReq(RoleEnum.teacher, 2));
    expect(svc.findByTeacher).toHaveBeenLastCalledWith('staff-b');
  });
});

describe('TeacherSubjectRequirementsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());
  const handler = TeacherSubjectRequirementsController.prototype.findMine;

  function buildContext(roleId: number): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => TeacherSubjectRequirementsController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: { id: roleId } } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows Teacher, Section Head, Admin, and Principal callers', () => {
    expect(guard.canActivate(buildContext(RoleEnum.teacher))).toBe(true);
    expect(guard.canActivate(buildContext(RoleEnum.section_head))).toBe(true);
    expect(guard.canActivate(buildContext(RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(RoleEnum.principal))).toBe(true);
  });

  it('denies Student and Guardian callers', () => {
    expect(guard.canActivate(buildContext(RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(RoleEnum.guardian))).toBe(false);
  });
});
