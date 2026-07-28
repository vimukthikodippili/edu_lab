import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { EventController } from './event.controller';

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

describe('EventController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('create/findAll/publish/cancel — Admin and Principal only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', EventController.prototype.create],
      ['findAll', EventController.prototype.findAll],
      ['publish', EventController.prototype.publish],
      ['cancel', EventController.prototype.cancel],
      ['findOne', EventController.prototype.findOne],
    ];

    it.each(handlers)('%s allows Admin and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(EventController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(EventController, handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Teacher and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(EventController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(EventController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('published — visible to every role (no @Roles() metadata)', () => {
    const handler = EventController.prototype.findPublished;

    it.each([
      RoleEnum.admin, RoleEnum.principal, RoleEnum.section_head, RoleEnum.teacher,
      RoleEnum.student, RoleEnum.guardian, RoleEnum.counselor, RoleEnum.school_psychologist,
    ])('allows role id %i', (roleId) => {
      expect(guard.canActivate(buildContext(EventController, handler, roleId))).toBe(true);
    });
  });
});
