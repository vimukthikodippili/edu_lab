import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SessionEquipmentController } from './session-equipment.controller';

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

describe('SessionEquipmentController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('read routes (findForBooking/findDamageReports) — broad staff access', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findForBooking', SessionEquipmentController.prototype.findForBooking],
      ['findDamageReports', SessionEquipmentController.prototype.findDamageReports],
    ];

    it.each(handlers)('%s allows Admin, Principal, Section Head, and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.teacher))).toBe(true);
    });

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('submitSessionReport — teacher, admin, principal only (real narrowing is the service ownership check on the booking teacher)', () => {
    const handler = SessionEquipmentController.prototype.submitSessionReport;

    it('allows Teacher, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Section Head, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(SessionEquipmentController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
