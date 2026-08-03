import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { VisitorController } from './visitor.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => VisitorController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('VisitorController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const receptionHandlers: [string, (...args: never[]) => unknown][] = [
    ['signIn', VisitorController.prototype.signIn],
    ['signOut', VisitorController.prototype.signOut],
    ['listActive', VisitorController.prototype.listActive],
    ['search', VisitorController.prototype.search],
    ['dailyReport', VisitorController.prototype.dailyReport],
    ['badgePdf', VisitorController.prototype.badgePdf],
    ['verifyBadge', VisitorController.prototype.verifyBadge],
  ];

  it.each(receptionHandlers)('%s allows Security Officer, Admin, and Principal', (_name, handler) => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.security_officer))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
  });

  it.each(receptionHandlers)('%s denies Teacher and Guardian', (_name, handler) => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
  });

  describe('setBlocked — Admin/Principal only, Security Officer excluded', () => {
    const handler = VisitorController.prototype.setBlocked;

    it('allows Admin and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Security Officer — the block list is Admin/Principal-only per FR-P5-VM-14', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.security_officer))).toBe(false);
    });
  });

  describe('blockNewVisitor — Admin/Principal only, Security Officer excluded (same rule as setBlocked)', () => {
    const handler = VisitorController.prototype.blockNewVisitor;

    it('allows Admin and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Security Officer', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.security_officer))).toBe(false);
    });
  });
});
