import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { PerformanceController } from './performance.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => PerformanceController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('PerformanceController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('findEntryGrid — visible to Principal, Section Head, and the Coach, per the story AC', () => {
    const handler = PerformanceController.prototype.findEntryGrid;

    it('allows Teacher, Section Head, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('bulkUpsert — Coach + Admin/Principal only, NOT Section Head (same asymmetry as match management)', () => {
    const handler = PerformanceController.prototype.bulkUpsert;

    it('allows Teacher, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Section Head', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('grantOverride — Admin/Principal only', () => {
    const handler = PerformanceController.prototype.grantOverride;

    it('allows Admin and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Teacher and Section Head — the override grant itself is not a coach action', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
    });
  });
});
