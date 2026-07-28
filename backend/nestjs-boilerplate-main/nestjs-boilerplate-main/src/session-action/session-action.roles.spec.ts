import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SessionActionController } from './session-action.controller';

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

describe('SessionActionController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('updateStatus (write) — counselor, school_psychologist only — FR-MHA-32', () => {
    const handler = SessionActionController.prototype.updateStatus;

    it('allows Counselor and School Psychologist', () => {
      expect(guard.canActivate(buildContext(SessionActionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(SessionActionController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Admin and Principal — oversight roles do not track actions on the counselor\'s behalf', () => {
      expect(guard.canActivate(buildContext(SessionActionController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(SessionActionController, handler, RoleEnum.principal))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(SessionActionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(SessionActionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(SessionActionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
