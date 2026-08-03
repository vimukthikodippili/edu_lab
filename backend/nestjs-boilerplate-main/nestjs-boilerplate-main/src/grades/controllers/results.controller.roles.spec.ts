import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../roles/roles.guard';
import { RoleEnum } from '../../roles/roles.enum';
import { ResultsController } from './results.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ResultsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('ResultsController — publish route access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());
  const handler = ResultsController.prototype.publishResults;

  it('allows Principal and Section Head callers', () => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
  });

  it('denies Admin — the "Exam Admin" stand-in was replaced by Section Head, not added to', () => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
  });

  it('denies Teacher, Student, and Guardian callers', () => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
  });
});
