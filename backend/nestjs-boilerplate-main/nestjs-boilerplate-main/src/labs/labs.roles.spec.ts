import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { LabTypeController } from './lab-type.controller';
import { LabController } from './lab.controller';

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

describe('LabTypeController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('read route (findAll) — broad staff access', () => {
    const handler = LabTypeController.prototype.findAll;

    it('allows Admin, Principal, Section Head, and Teacher', () => {
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.teacher))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('management routes (create/update/delete) — admin, principal only, per "As a principal or admin"', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', LabTypeController.prototype.create],
      ['update', LabTypeController.prototype.update],
      ['delete', LabTypeController.prototype.delete],
    ];

    it.each(handlers)('%s allows Admin and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)(
      '%s denies Section Head — the real deviation from the Sport Type precedent',
      (_name, handler) => {
        expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.section_head))).toBe(false);
      },
    );

    it.each(handlers)('%s denies Teacher, Student, and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(LabTypeController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});

describe('LabController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('read routes (findAll/getDirectory) — broad staff access', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findAll', LabController.prototype.findAll],
      ['getDirectory', LabController.prototype.getDirectory],
    ];

    it.each(handlers)('%s allows Admin, Principal, Section Head, and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.teacher))).toBe(true);
    });

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('management routes (create/update/delete) — admin, principal only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', LabController.prototype.create],
      ['update', LabController.prototype.update],
      ['delete', LabController.prototype.delete],
    ];

    it.each(handlers)('%s allows Admin and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Section Head and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.teacher))).toBe(false);
    });
  });

  describe('toggleMaintenance — teacher, admin, principal at the guard level (real narrowing is the service ownership check)', () => {
    const handler = LabController.prototype.toggleMaintenance;

    it('allows Teacher, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Section Head, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('booking routes (createBooking/findBookings/cancelBooking/createRecurringBooking) — broad staff access', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['createBooking', LabController.prototype.createBooking],
      ['findBookings', LabController.prototype.findBookings],
      ['cancelBooking', LabController.prototype.cancelBooking],
      ['createRecurringBooking', LabController.prototype.createRecurringBooking],
    ];

    it.each(handlers)('%s allows Admin, Principal, Section Head, and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.teacher))).toBe(true);
    });

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(LabController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
