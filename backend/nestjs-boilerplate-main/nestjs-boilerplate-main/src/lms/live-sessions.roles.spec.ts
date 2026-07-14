import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { LiveSessionsController } from './live-sessions.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => LiveSessionsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('LiveSessionsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('POST /lms/live-classes (create)', () => {
    const handler = LiveSessionsController.prototype.create;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /lms/live-classes/my-class (findForMyClass)', () => {
    const handler = LiveSessionsController.prototype.findForMyClass;

    it('allows only Student callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
    });

    it('denies Teacher, Section Head, Admin, Principal, and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /lms/live-classes/mine (findMine)', () => {
    const handler = LiveSessionsController.prototype.findMine;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('POST /lms/live-classes/:id/token (mintToken)', () => {
    const handler = LiveSessionsController.prototype.mintToken;

    it('allows Teacher, Section Head, Admin, Principal, and Student callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
    });

    it('denies Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('POST /lms/live-classes/:id/end (end)', () => {
    const handler = LiveSessionsController.prototype.end;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('POST /lms/live-classes/:id/attendance/join (recordJoin)', () => {
    const handler = LiveSessionsController.prototype.recordJoin;

    it('allows only Student callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
    });

    it('denies Teacher, Section Head, Admin, Principal, and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('POST /lms/live-classes/:id/attendance/leave (recordLeave)', () => {
    const handler = LiveSessionsController.prototype.recordLeave;

    it('allows only Student callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
    });

    it('denies Teacher, Section Head, Admin, Principal, and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('GET /lms/live-classes/:id/attendance (getAttendance)', () => {
    const handler = LiveSessionsController.prototype.getAttendance;

    it('allows Teacher, Section Head, Admin, and Principal callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian callers', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
