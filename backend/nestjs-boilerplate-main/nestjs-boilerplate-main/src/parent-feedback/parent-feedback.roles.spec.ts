import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ParentFeedbackController } from './parent-feedback.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => ParentFeedbackController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('ParentFeedbackController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('create / findMine / getMine — Guardian only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', ParentFeedbackController.prototype.create],
      ['findMine', ParentFeedbackController.prototype.findMine],
      ['getMine', ParentFeedbackController.prototype.getMine],
    ];

    it.each(handlers)('%s allows Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
    });

    it.each(handlers)('%s denies Admin, Principal, and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    });
  });

  describe('findAll / markUnderReview / respond — Admin/Principal only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findAll', ParentFeedbackController.prototype.findAll],
      ['markUnderReview', ParentFeedbackController.prototype.markUnderReview],
      ['respond', ParentFeedbackController.prototype.respond],
    ];

    it.each(handlers)('%s allows Admin and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Guardian and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    });
  });
});
