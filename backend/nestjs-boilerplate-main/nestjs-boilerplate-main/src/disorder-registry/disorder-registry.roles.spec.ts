import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { DisorderRegistryController } from './disorder-registry.controller';

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

describe('DisorderRegistryController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('read routes (findAll/findOne) — admin, principal, teacher, counselor, school_psychologist', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findAll', DisorderRegistryController.prototype.findAll],
      ['findOne', DisorderRegistryController.prototype.findOne],
    ];

    it.each(handlers)('%s allows Admin, Principal, Teacher, Counselor, and School Psychologist', (_name, handler) => {
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.counselor))).toBe(true);
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.school_psychologist))).toBe(true);
    });

    it.each(handlers)('%s denies Student, Guardian, and Security Officer', (_name, handler) => {
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.guardian))).toBe(false);
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.security_officer))).toBe(false);
    });
  });

  describe('management routes (create/update) — Admin-only, deliberately not admin+principal', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', DisorderRegistryController.prototype.create],
      ['update', DisorderRegistryController.prototype.update],
    ];

    it.each(handlers)('%s allows Admin', (_name, handler) => {
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.admin))).toBe(true);
    });

    it.each(handlers)('%s denies Principal (deliberate deviation from the usual admin+principal write pairing)', (_name, handler) => {
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.principal))).toBe(false);
    });

    // Explicitly-requested assertion (b): a Teacher-role user gets 403 on the CRUD write endpoints.
    it.each(handlers)('%s denies Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.teacher))).toBe(false);
    });

    it.each(handlers)('%s denies Counselor and School Psychologist', (_name, handler) => {
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.counselor))).toBe(false);
      expect(guard.canActivate(buildContext(DisorderRegistryController, handler, RoleEnum.school_psychologist))).toBe(false);
    });
  });
});
