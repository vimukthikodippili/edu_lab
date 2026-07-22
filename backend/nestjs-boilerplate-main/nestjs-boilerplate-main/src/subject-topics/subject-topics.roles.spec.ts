import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SubjectTopicsController } from './subject-topics.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => SubjectTopicsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('SubjectTopicsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['findActive', SubjectTopicsController.prototype.findActive],
    ['create', SubjectTopicsController.prototype.create],
    ['reorder', SubjectTopicsController.prototype.reorder],
    ['rename', SubjectTopicsController.prototype.rename],
    ['archive', SubjectTopicsController.prototype.archive],
  ];

  it.each(handlers)('%s allows Teacher, Admin, and Principal callers', (_name, handler) => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
  });

  it.each(handlers)('%s denies Student and Guardian callers', (_name, handler) => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
  });
});
