import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { PreRegisteredVisitorController } from './pre-registered-visitor.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => PreRegisteredVisitorController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('PreRegisteredVisitorController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('create — any staff-linked role except student/guardian', () => {
    const handler = PreRegisteredVisitorController.prototype.create;

    it('allows every staff portal role', () => {
      const staffRoles = [
        RoleEnum.teacher,
        RoleEnum.section_head,
        RoleEnum.counselor,
        RoleEnum.librarian,
        RoleEnum.accountant,
        RoleEnum.school_psychologist,
        RoleEnum.security_officer,
        RoleEnum.admin,
        RoleEnum.principal,
      ];
      for (const roleId of staffRoles) {
        expect(guard.canActivate(buildContext(handler, roleId))).toBe(true);
      }
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findForToday / search — reception lookup, Security Officer/Admin/Principal only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findForToday', PreRegisteredVisitorController.prototype.findForToday],
      ['search', PreRegisteredVisitorController.prototype.search],
    ];

    it.each(handlers)('%s allows Security Officer, Admin, and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.security_officer))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Teacher — the lookup is reception/admin-only, not every staff role', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    });
  });
});
