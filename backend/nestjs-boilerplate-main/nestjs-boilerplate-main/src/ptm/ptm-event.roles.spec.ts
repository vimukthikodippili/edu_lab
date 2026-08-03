import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { PTMEventController } from './ptm-event.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => PTMEventController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('PTMEventController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('create / publish — Admin/Principal only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', PTMEventController.prototype.create],
      ['publish', PTMEventController.prototype.publish],
    ];

    it.each(handlers)('%s allows Admin and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Teacher and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findAll / getById — Admin, Principal, Teacher, Guardian all allowed', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findAll', PTMEventController.prototype.findAll],
      ['getById', PTMEventController.prototype.getById],
    ];

    it.each(handlers)('%s allows every portal role except Student', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
    });

    it.each(handlers)('%s denies Student', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    });
  });

  describe('submitAvailability — Teacher only', () => {
    const handler = PTMEventController.prototype.submitAvailability;

    it('allows Teacher', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
    });

    it('denies Admin, Principal, and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('getTeacherSchedule — Teacher, Admin, Principal (Guardian excluded)', () => {
    const handler = PTMEventController.prototype.getTeacherSchedule;

    it('allows Teacher, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
