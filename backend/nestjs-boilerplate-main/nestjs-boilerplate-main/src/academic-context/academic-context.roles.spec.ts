import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { AcademicContextController } from './academic-context.controller';

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

describe('AcademicContextController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());
  const handler = AcademicContextController.prototype.getAcademicContext;

  it('allows Counselor and School Psychologist', () => {
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.counselor))).toBe(true);
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.school_psychologist))).toBe(true);
  });

  it('denies Admin and Principal — narrower than mha-consent/mha-session read routes; AI prompt is explicit: Counselor/SchoolPsychologist only', () => {
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.admin))).toBe(false);
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.principal))).toBe(false);
  });

  // AI-prompt-mandated test (b): "a Teacher-role request returns 403" — RolesGuard returning
  // false is what triggers Nest's default ForbiddenException (403) at the HTTP layer.
  it('denies Teacher', () => {
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.teacher))).toBe(false);
  });

  it('denies Student, Guardian, and Section Head', () => {
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.guardian))).toBe(false);
    expect(guard.canActivate(buildContext(AcademicContextController, handler, RoleEnum.section_head))).toBe(false);
  });
});
