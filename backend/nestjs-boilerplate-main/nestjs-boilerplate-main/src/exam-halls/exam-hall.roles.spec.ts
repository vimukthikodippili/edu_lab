import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ExamHallController } from './exam-hall.controller';

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

describe('ExamHallController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['create', ExamHallController.prototype.create],
    ['findAll', ExamHallController.prototype.findAll],
    ['findOne', ExamHallController.prototype.findOne],
  ];

  it.each(handlers)('%s allows Admin, Principal, and Section Head', (_name, handler) => {
    expect(guard.canActivate(buildContext(ExamHallController, handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(ExamHallController, handler, RoleEnum.principal))).toBe(true);
    expect(guard.canActivate(buildContext(ExamHallController, handler, RoleEnum.section_head))).toBe(true);
  });

  it.each(handlers)('%s denies Teacher and Guardian', (_name, handler) => {
    expect(guard.canActivate(buildContext(ExamHallController, handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(ExamHallController, handler, RoleEnum.guardian))).toBe(false);
  });
});
