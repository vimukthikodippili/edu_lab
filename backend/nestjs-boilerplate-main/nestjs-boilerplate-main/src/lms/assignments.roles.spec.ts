import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { AssignmentsController } from './assignments.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => AssignmentsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('AssignmentsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('POST /lms/assignments (create)', () => {
    const handler = AssignmentsController.prototype.create;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /lms/assignments/my-class (findForMyClass)', () => {
    const handler = AssignmentsController.prototype.findForMyClass;

    it('allows only Student callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
    });

    it('denies Teacher, Section Head, Admin, Principal, and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /lms/assignments/mine (findMine)', () => {
    const handler = AssignmentsController.prototype.findMine;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /lms/assignments/:assignmentId/roster (getRoster)', () => {
    const handler = AssignmentsController.prototype.getRoster;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /lms/assignments/guardian/:studentId (findForGuardianChild)', () => {
    const handler = AssignmentsController.prototype.findForGuardianChild;

    it('allows only Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
    });

    it('denies Teacher, Section Head, Admin, Principal, and Student callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    });
  });
});
