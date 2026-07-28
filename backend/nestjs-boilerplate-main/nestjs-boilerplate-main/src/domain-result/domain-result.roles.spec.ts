import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { DomainResultController } from './domain-result.controller';

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

describe('DomainResultController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('list (read) — principal, counselor, school_psychologist only — FR-MHA-30, narrower than the session shell', () => {
    const handler = DomainResultController.prototype.list;

    it('allows Principal, Counselor, and School Psychologist', () => {
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Admin — FR-MHA-30 excludes admin from domain-result clinical content, unlike the mha-sessions/:id shell', () => {
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.admin))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('update (write) — counselor, school_psychologist only — FR-MHA-02, principal is read-only oversight, not an assessor', () => {
    const handler = DomainResultController.prototype.update;

    it('allows Counselor and School Psychologist', () => {
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Admin and Principal', () => {
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.principal))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(DomainResultController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
