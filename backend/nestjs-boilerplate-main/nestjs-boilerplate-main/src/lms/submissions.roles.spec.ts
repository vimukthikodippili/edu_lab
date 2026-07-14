import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SubmissionsController } from './submissions.controller';
import { AssignmentsController } from './assignments.controller';

function buildContext(
  handler: (...args: never[]) => unknown,
  controllerClass: unknown,
  roleId: number,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

const OTHER_ROLES = [
  RoleEnum.teacher,
  RoleEnum.section_head,
  RoleEnum.admin,
  RoleEnum.principal,
  RoleEnum.guardian,
];

describe('SubmissionsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('POST /lms/assignments/:assignmentId/submissions (submit)', () => {
    const handler = SubmissionsController.prototype.submit;

    it('allows only Student callers', () => {
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.student))).toBe(true);
    });

    it('denies every other role', () => {
      OTHER_ROLES.forEach((roleId) => {
        expect(guard.canActivate(buildContext(handler, SubmissionsController, roleId))).toBe(false);
      });
    });
  });

  describe('GET /lms/assignments/:assignmentId/submissions/me (findMine)', () => {
    const handler = SubmissionsController.prototype.findMine;

    it('allows only Student callers', () => {
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.student))).toBe(true);
    });

    it('denies every other role', () => {
      OTHER_ROLES.forEach((roleId) => {
        expect(guard.canActivate(buildContext(handler, SubmissionsController, roleId))).toBe(false);
      });
    });
  });

  describe('PATCH /lms/assignments/:assignmentId/submissions/:submissionId/grade (grade)', () => {
    const handler = SubmissionsController.prototype.grade;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, SubmissionsController, RoleEnum.guardian))).toBe(false);
    });
  });
});

describe('AssignmentsController — GET /lms/assignments/submissions/statuses role-based access control', () => {
  const guard = new RolesGuard(new Reflector());
  const handler = AssignmentsController.prototype.findSubmissionStatuses;

  it('allows only Student callers', () => {
    expect(guard.canActivate(buildContext(handler, AssignmentsController, RoleEnum.student))).toBe(true);
  });

  it('denies every other role', () => {
    OTHER_ROLES.forEach((roleId) => {
      expect(guard.canActivate(buildContext(handler, AssignmentsController, roleId))).toBe(false);
    });
  });
});
