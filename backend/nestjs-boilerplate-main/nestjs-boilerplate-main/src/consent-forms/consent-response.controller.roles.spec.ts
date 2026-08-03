import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ConsentResponseController } from './consent-response.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ConsentResponseController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('ConsentResponseController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const guardianOnlyHandlers = [
    ConsentResponseController.prototype.listPending,
    ConsentResponseController.prototype.listMyResponses,
    ConsentResponseController.prototype.respond,
  ];

  it('allows only Guardian on every guardian-facing route', () => {
    for (const handler of guardianOnlyHandlers) {
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
    }
  });

  it('denies Admin, Principal, Teacher, and Student on every guardian-facing route', () => {
    for (const handler of guardianOnlyHandlers) {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    }
  });
});
