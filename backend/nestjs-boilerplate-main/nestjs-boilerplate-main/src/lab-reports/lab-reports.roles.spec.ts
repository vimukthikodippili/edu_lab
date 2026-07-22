import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { LabReportsController } from './lab-reports.controller';

function buildContext(
  controllerClass: new (...args: never[]) => unknown,
  handler: (...args: never[]) => unknown,
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

describe('LabReportsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('teacher routes (create/roster/grade) — teacher, admin, principal only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['createAssignment', LabReportsController.prototype.createAssignment],
      ['getAssignment', LabReportsController.prototype.getAssignment],
      ['getRoster', LabReportsController.prototype.getRoster],
      ['gradeSubmission', LabReportsController.prototype.gradeSubmission],
    ];

    it.each(handlers)('%s allows Teacher, Admin, and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Section Head, Student, and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('student routes (my-class/submit/findMine) — student only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findMyClassAssignments', LabReportsController.prototype.findMyClassAssignments],
      ['submit', LabReportsController.prototype.submit],
      ['findMine', LabReportsController.prototype.findMine],
    ];

    it.each(handlers)('%s allows Student', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.student))).toBe(true);
    });

    it.each(handlers)('%s denies Teacher and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('guardian route (findForGuardianChild) — guardian only', () => {
    const handler = LabReportsController.prototype.findForGuardianChild;

    it('allows Guardian', () => {
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.guardian))).toBe(true);
    });

    it('denies Student, Teacher, and Admin', () => {
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(LabReportsController, handler, RoleEnum.admin))).toBe(false);
    });
  });
});
