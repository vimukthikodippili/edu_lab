import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { TeacherPerformanceController } from './teacher-performance.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => TeacherPerformanceController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('TeacherPerformanceController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('GET /teacher-performance/staff/:staffId — cross-teacher access denial', () => {
    const handler = TeacherPerformanceController.prototype.getStaffPerformance;

    it('denies a Teacher-role caller — RoleEnum.teacher is not in this route\'s @Roles metadata', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    });

    it('denies an unrelated role (e.g. student)', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    });

    it('allows Principal, Section Head, and Admin callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
    });
  });

  describe('GET /teacher-performance/me — unchanged self-view access', () => {
    const handler = TeacherPerformanceController.prototype.getMyPerformance;

    it('still allows a Teacher-role caller', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
    });

    it('still denies a Principal-role caller (this route is self-view only)', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
    });
  });
});
