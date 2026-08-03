import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ExamInvigilatorController } from './exam-invigilator.controller';

function buildContext(
  controllerClass: new (...args: never[]) => unknown,
  handler: (...args: never[]) => unknown,
  roleId: number,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('ExamInvigilatorController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('assign / list — Admin, Principal, and Section Head', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['assign', ExamInvigilatorController.prototype.assign],
      ['list', ExamInvigilatorController.prototype.list],
    ];

    it.each(handlers)('%s allows Admin, Principal, and Section Head', (_name, handler) => {
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.section_head))).toBe(true);
    });

    it.each(handlers)('%s denies Teacher and Student', (_name, handler) => {
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.student))).toBe(false);
    });
  });

  describe('dayDashboard — Admin and Principal ONLY (Section Head deliberately excluded)', () => {
    const handler = ExamInvigilatorController.prototype.dayDashboard;

    it('allows Admin and Principal', () => {
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Section Head — narrower audience than every other route in this module', () => {
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.section_head))).toBe(false);
    });

    it('denies Teacher and Student', () => {
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(ExamInvigilatorController, handler, RoleEnum.student))).toBe(false);
    });
  });
});
