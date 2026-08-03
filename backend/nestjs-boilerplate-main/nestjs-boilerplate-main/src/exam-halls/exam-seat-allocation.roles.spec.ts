import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ExamSeatAllocationController } from './exam-seat-allocation.controller';

function buildContext(
  controllerClass: new (...args: never[]) => unknown,
  handler: (...args: never[]) => unknown,
  roleId: number,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({ getRequest: () => ({ user: { role: { id: roleId } } }) }),
  } as unknown as ExecutionContext;
}

describe('ExamSeatAllocationController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('allocate / listAllocations / override — Admin, Principal, Section Head', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['allocate', ExamSeatAllocationController.prototype.allocate],
      ['listAllocations', ExamSeatAllocationController.prototype.listAllocations],
      ['override', ExamSeatAllocationController.prototype.override],
    ];

    it.each(handlers)('%s allows Admin, Principal, and Section Head', (_name, handler) => {
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.section_head))).toBe(true);
    });

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('myAdmitCard — Student only', () => {
    const handler = ExamSeatAllocationController.prototype.myAdmitCard;

    it('allows Student', () => {
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.student))).toBe(true);
    });

    it('denies Guardian, Admin, and Section Head', () => {
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.guardian))).toBe(false);
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.section_head))).toBe(false);
    });
  });

  describe('childAdmitCard — Guardian only', () => {
    const handler = ExamSeatAllocationController.prototype.childAdmitCard;

    it('allows Guardian', () => {
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.guardian))).toBe(true);
    });

    it('denies Student, Admin, and Section Head', () => {
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(ExamSeatAllocationController, handler, RoleEnum.section_head))).toBe(false);
    });
  });
});
