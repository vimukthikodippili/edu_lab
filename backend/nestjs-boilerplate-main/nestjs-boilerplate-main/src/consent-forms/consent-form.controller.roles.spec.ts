import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ConsentFormController } from './consent-form.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ConsentFormController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('ConsentFormController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const adminOnlyHandlers = [
    ConsentFormController.prototype.create,
    ConsentFormController.prototype.findAll,
    ConsentFormController.prototype.getById,
    ConsentFormController.prototype.getDashboard,
    ConsentFormController.prototype.remindPending,
  ];

  it('allows Admin and Principal on every admin route', () => {
    for (const handler of adminOnlyHandlers) {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    }
  });

  it('denies Teacher, Guardian, Student, and Security Officer on every admin route', () => {
    for (const handler of adminOnlyHandlers) {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.security_officer))).toBe(false);
    }
  });
});
