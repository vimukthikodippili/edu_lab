import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { CounselorNotesController } from './counselor-notes.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => CounselorNotesController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('CounselorNotesController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('POST /counselor-notes — Counselor-only write access', () => {
    const handler = CounselorNotesController.prototype.create;

    it('allows a Counselor caller', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(true);
    });

    it('denies Principal, Teacher, Student, and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /counselor-notes/student/:studentId — Principal/Counselor-only read (FR-WB-10)', () => {
    const handler = CounselorNotesController.prototype.findForStudent;

    it('allows Principal and Counselor callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(true);
    });

    it('denies Teacher, Student, and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('PATCH /counselor-notes/:id/approved-summary', () => {
    const handler = CounselorNotesController.prototype.setApprovedSummary;

    it('allows Counselor and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Teacher, Student, and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /counselor-notes/guardian/summaries — Guardian-only, never Counselor/Principal/Teacher', () => {
    const handler = CounselorNotesController.prototype.findApprovedSummariesForGuardian;

    it('allows a Guardian caller', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
    });

    it('denies Counselor, Principal, and Teacher callers — this route is guardian-only', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    });
  });
});
