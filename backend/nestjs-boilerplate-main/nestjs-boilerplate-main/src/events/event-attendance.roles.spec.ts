import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { EventAttendanceController } from './event-attendance.controller';

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

describe('EventAttendanceController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['checkIn', EventAttendanceController.prototype.checkIn],
    ['dashboard', EventAttendanceController.prototype.dashboard],
    ['attendanceReportPdf', EventAttendanceController.prototype.attendanceReportPdf],
  ];

  it.each(handlers)('%s allows Admin, Principal, and Security Officer', (_name, handler) => {
    expect(guard.canActivate(buildContext(EventAttendanceController, handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(EventAttendanceController, handler, RoleEnum.principal))).toBe(true);
    expect(guard.canActivate(buildContext(EventAttendanceController, handler, RoleEnum.security_officer))).toBe(true);
  });

  it.each(handlers)('%s denies Teacher and Guardian', (_name, handler) => {
    expect(guard.canActivate(buildContext(EventAttendanceController, handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(EventAttendanceController, handler, RoleEnum.guardian))).toBe(false);
  });
});
