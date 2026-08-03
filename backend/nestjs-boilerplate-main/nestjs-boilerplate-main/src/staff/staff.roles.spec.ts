import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { StaffController } from './staff.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => StaffController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

/** Security Officer needs to search the staff directory to resolve a "host" when signing in a
 * visitor (P5-VM-01) and when pre-registering one — a real 403 was hit live because this route
 * predates the Visitor Management module and was never updated to include that role. */
describe('StaffController — findMany role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());
  const handler = StaffController.prototype.findMany;

  it('allows Admin, Principal, Section Head, and Security Officer', () => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.security_officer))).toBe(true);
  });

  it('denies Teacher, Guardian, and Student', () => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
  });
});
