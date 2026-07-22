import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ExperimentLogController } from './experiment-log.controller';

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

describe('ExperimentLogController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('findForBooking/upsertForBooking — teacher, admin, principal only (no section_head — real narrowing is the service ownership check on the booking teacher)', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findForBooking', ExperimentLogController.prototype.findForBooking],
      ['upsertForBooking', ExperimentLogController.prototype.upsertForBooking],
    ];

    it.each(handlers)('%s allows Teacher, Admin, and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Section Head, Student, and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('findFiltered — the searchable history view — admin, principal, section_head, and teacher (own sessions only)', () => {
    const handler = ExperimentLogController.prototype.findFiltered;

    it('allows Admin, Principal, Section Head, and Teacher', () => {
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.teacher))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(ExperimentLogController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
