import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { MhaParentNotificationController } from './mha-parent-notification.controller';

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

describe('MhaParentNotificationController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('notifyGuardian — counselor only (FR-MHA-33/AI prompt: "visible to Counselor role only")', () => {
    const handler = MhaParentNotificationController.prototype.notifyGuardian;

    it('allows Counselor', () => {
      expect(guard.canActivate(buildContext(MhaParentNotificationController, handler, RoleEnum.counselor))).toBe(true);
    });

    it('denies School Psychologist — a deliberate narrowing from this module\'s usual counselor+school_psychologist pairing', () => {
      expect(guard.canActivate(buildContext(MhaParentNotificationController, handler, RoleEnum.school_psychologist))).toBe(false);
    });

    it('denies Admin and Principal', () => {
      expect(guard.canActivate(buildContext(MhaParentNotificationController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(MhaParentNotificationController, handler, RoleEnum.principal))).toBe(false);
    });

    it('denies Teacher, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(MhaParentNotificationController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(MhaParentNotificationController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(MhaParentNotificationController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
