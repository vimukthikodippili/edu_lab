import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { BehavioralObservationsController } from './behavioral-observations.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => BehavioralObservationsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('BehavioralObservationsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('GET /behavioral-observations/student/:studentId — write-only-for-Teacher enforcement', () => {
    const handler = BehavioralObservationsController.prototype.findForStudent;

    it('denies a Teacher-role caller — a teacher can log an observation but never read one back, including their own', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    });

    it('denies an unrelated role (e.g. student, guardian)', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });

    it('allows Principal and Counselor callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(true);
    });
  });

  describe('POST /behavioral-observations — Teacher-only write access', () => {
    const handler = BehavioralObservationsController.prototype.create;

    it('allows a Teacher-role caller', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
    });

    it('denies Principal and Counselor callers (this route is Teacher-only)', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(false);
    });
  });
});
