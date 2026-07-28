import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { EventRegistrationController } from './event-registration.controller';

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

describe('EventRegistrationController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['register', EventRegistrationController.prototype.register],
    ['myRegistrations', EventRegistrationController.prototype.myRegistrations],
    ['cancelMyRegistration', EventRegistrationController.prototype.cancelMyRegistration],
  ];

  it.each(handlers)('%s allows Guardian', (_name, handler) => {
    expect(guard.canActivate(buildContext(EventRegistrationController, handler, RoleEnum.guardian))).toBe(true);
  });

  it.each(handlers)('%s denies Admin, Principal, and Teacher', (_name, handler) => {
    expect(guard.canActivate(buildContext(EventRegistrationController, handler, RoleEnum.admin))).toBe(false);
    expect(guard.canActivate(buildContext(EventRegistrationController, handler, RoleEnum.principal))).toBe(false);
    expect(guard.canActivate(buildContext(EventRegistrationController, handler, RoleEnum.teacher))).toBe(false);
  });
});
