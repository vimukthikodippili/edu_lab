import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SportsController } from './sports.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => SportsController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('SportsController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('management routes (create/update/findAll) — admin, principal, section_head only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', SportsController.prototype.create],
      ['update', SportsController.prototype.update],
      ['findAll', SportsController.prototype.findAll],
    ];

    it.each(handlers)('%s allows Admin, Principal, and Section Head', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
    });

    it.each(handlers)('%s denies Teacher, Student, and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('roster routes (getRoster/enrollStudent/removeFromRoster) — teacher (coach) + privileged roles', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['getRoster', SportsController.prototype.getRoster],
      ['enrollStudent', SportsController.prototype.enrollStudent],
      ['removeFromRoster', SportsController.prototype.removeFromRoster],
    ];

    it.each(handlers)('%s allows Teacher, Section Head, Admin, and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findMyCoached — self-scoped coach discovery', () => {
    const handler = SportsController.prototype.findMyCoached;

    it('allows Teacher, Section Head, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('match management routes (createMatch/updateMatch) — Coach + Admin/Principal only, NOT Section Head', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['createMatch', SportsController.prototype.createMatch],
      ['updateMatch', SportsController.prototype.updateMatch],
    ];

    it.each(handlers)('%s allows Teacher, Admin, and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)(
      '%s denies Section Head — the real asymmetry from the roster/sport-management routes above',
      (_name, handler) => {
        expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      },
    );

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findMatches — visible to Principal, Section Head, and the Coach, per the story AC', () => {
    const handler = SportsController.prototype.findMatches;

    it('allows Teacher, Section Head, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('training session management routes (createTrainingSession/updateTrainingSession) — same asymmetry as match management', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['createTrainingSession', SportsController.prototype.createTrainingSession],
      ['updateTrainingSession', SportsController.prototype.updateTrainingSession],
    ];

    it.each(handlers)('%s allows Teacher, Admin, and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Section Head', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
    });

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findTrainingSessions — visible to Principal, Section Head, and the Coach', () => {
    const handler = SportsController.prototype.findTrainingSessions;

    it('allows Teacher, Section Head, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('getDirectory — Principal-facing, per the AC', () => {
    const handler = SportsController.prototype.getDirectory;

    it('allows Principal and Admin', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
    });

    it('denies Section Head, Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
