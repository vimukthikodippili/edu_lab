import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { MhaConsentController } from './mha-consent.controller';

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

describe('MhaConsentController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('write route (record) — Counselor and School Psychologist only', () => {
    const handler = MhaConsentController.prototype.record;

    it('allows Counselor and School Psychologist', () => {
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Admin and Principal (consent is a counselor-authored record, not an admin action)', () => {
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.principal))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('read route (getStatus) — admin, principal, counselor, school_psychologist', () => {
    const handler = MhaConsentController.prototype.getStatus;

    it('allows Admin, Principal, Counselor, and School Psychologist', () => {
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Teacher and Section Head — FR-MHA-30, class teachers cannot access this data', () => {
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.section_head))).toBe(false);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaConsentController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
