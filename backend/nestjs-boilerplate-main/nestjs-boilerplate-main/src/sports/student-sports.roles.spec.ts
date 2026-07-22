import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { StudentSportsController } from './student-sports.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => StudentSportsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('StudentSportsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('getMyPerformance — Student/Guardian only, the inverse of every other sports route', () => {
    const handler = StudentSportsController.prototype.getMyPerformance;

    it('allows Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
    });

    it('denies Teacher, Section Head, Admin, and Principal — this is a self-view, not a staff route', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
    });
  });
});
