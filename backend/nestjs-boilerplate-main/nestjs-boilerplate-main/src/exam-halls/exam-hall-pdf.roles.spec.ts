import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ExamHallPdfController } from './exam-hall-pdf.controller';

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

describe('ExamHallPdfController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['seatingPlan', ExamHallPdfController.prototype.seatingPlan],
    ['entryList', ExamHallPdfController.prototype.entryList],
  ];

  it.each(handlers)('%s allows Admin, Principal, and Section Head', (_name, handler) => {
    expect(guard.canActivate(buildContext(ExamHallPdfController, handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(ExamHallPdfController, handler, RoleEnum.principal))).toBe(true);
    expect(guard.canActivate(buildContext(ExamHallPdfController, handler, RoleEnum.section_head))).toBe(true);
  });

  it.each(handlers)('%s denies Teacher and Guardian', (_name, handler) => {
    expect(guard.canActivate(buildContext(ExamHallPdfController, handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(ExamHallPdfController, handler, RoleEnum.guardian))).toBe(false);
  });
});
