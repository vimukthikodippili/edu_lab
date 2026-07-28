import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { MhaSessionController } from './mha-session.controller';

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

describe('MhaSessionController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('preview & create — Counselor and School Psychologist only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['preview', MhaSessionController.prototype.preview],
      ['create', MhaSessionController.prototype.create],
    ];

    it.each(handlers)('%s allows Counselor and School Psychologist', (_name, handler) => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it.each(handlers)('%s denies Admin and Principal (only Counselor/Psychologist may initiate a session — FR-MHA-02)', (_name, handler) => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.principal))).toBe(false);
    });

    it.each(handlers)('%s denies Teacher, Student, and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findOne (read) — admin, principal, counselor, school_psychologist', () => {
    const handler = MhaSessionController.prototype.findOne;

    it('allows Admin, Principal, Counselor, and School Psychologist', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Teacher, Student, and Guardian — FR-MHA-30', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findAll (list, MHA-123) — admin, principal, counselor, school_psychologist', () => {
    const handler = MhaSessionController.prototype.findAll;

    it('allows Admin, Principal, Counselor, and School Psychologist', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('summary (MHA-124) — admin, principal, counselor, school_psychologist', () => {
    const handler = MhaSessionController.prototype.summary;

    it('allows Admin, Principal, Counselor, and School Psychologist', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Teacher, Student, and Guardian — FR-MHA-30', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('complete (MHA-123) — Counselor and School Psychologist only, matching create', () => {
    const handler = MhaSessionController.prototype.complete;

    it('allows Counselor and School Psychologist', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Admin and Principal — Principal is read-only oversight, not an assessor (FR-MHA-02)', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.principal))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('history (MHA-141) — Counselor, School Psychologist, and Principal only', () => {
    const handler = MhaSessionController.prototype.history;

    it('allows Counselor, School Psychologist, and Principal', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.school_psychologist))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Admin — AC #81 lists only Counselor/SchoolPsychologist/Principal, unlike findOne/findAll/summary above which include admin', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.admin))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('caseload (MHA-140) — Counselor and School Psychologist only', () => {
    const handler = MhaSessionController.prototype.caseload;

    it('allows Counselor and School Psychologist', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it('denies Admin and Principal — the AI prompt/AC explicitly restrict this view to Counselor and School Psychologist only', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.principal))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaSessionController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
