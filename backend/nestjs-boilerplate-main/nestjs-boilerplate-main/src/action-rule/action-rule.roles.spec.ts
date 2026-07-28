import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ActionRuleController } from './action-rule.controller';

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

describe('ActionRuleController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  // FR-MHA-37 — admin-only for both read and write, narrower than disorder-registry's broad
  // read access, since the rule set is a backend-generation input never shown during a session.
  const ALL_ROUTES: Array<(...args: never[]) => unknown> = [
    ActionRuleController.prototype.findAll,
    ActionRuleController.prototype.create,
    ActionRuleController.prototype.update,
  ];

  it.each(ALL_ROUTES)('allows Admin on every route', (handler) => {
    expect(guard.canActivate(buildContext(ActionRuleController, handler, RoleEnum.admin))).toBe(true);
  });

  it.each(ALL_ROUTES)('denies Principal, Counselor, and School Psychologist on every route', (handler) => {
    expect(guard.canActivate(buildContext(ActionRuleController, handler, RoleEnum.principal))).toBe(false);
    expect(guard.canActivate(buildContext(ActionRuleController, handler, RoleEnum.counselor))).toBe(false);
    expect(guard.canActivate(buildContext(ActionRuleController, handler, RoleEnum.school_psychologist))).toBe(false);
  });

  it.each(ALL_ROUTES)('denies Teacher, Student, and Guardian on every route', (handler) => {
    expect(guard.canActivate(buildContext(ActionRuleController, handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(ActionRuleController, handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(ActionRuleController, handler, RoleEnum.guardian))).toBe(false);
  });
});
