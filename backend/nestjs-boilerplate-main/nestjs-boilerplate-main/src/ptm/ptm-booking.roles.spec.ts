import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { PTMBookingController } from './ptm-booking.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => PTMBookingController,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('PTMBookingController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('listAvailableSlots — every portal role except Student', () => {
    const handler = PTMBookingController.prototype.listAvailableSlots;

    it('allows Admin, Principal, Teacher, and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
    });

    it('denies Student', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    });
  });

  describe('book / cancel / listMyBookings — Guardian only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['book', PTMBookingController.prototype.book],
      ['cancel', PTMBookingController.prototype.cancel],
      ['listMyBookings', PTMBookingController.prototype.listMyBookings],
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
});
