import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../roles/roles.guard';
import { RoleEnum } from '../../roles/roles.enum';
import { MaterialsCheckController } from './materials-check.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => MaterialsCheckController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('MaterialsCheckController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());
  const handlers = [
    MaterialsCheckController.prototype.getStatus,
    MaterialsCheckController.prototype.bulkCheck,
  ];

  it.each(handlers.map((h) => [h.name, h]))('%s allows Teacher, Section Head, Admin, and Principal callers', (_name, handler) => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
  });

  it.each(handlers.map((h) => [h.name, h]))('%s denies Student and Guardian callers', (_name, handler) => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
  });
});
