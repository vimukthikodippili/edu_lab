import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { ExamController } from './exam.controller';

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

describe('ExamController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['create', ExamController.prototype.create],
    ['findAll', ExamController.prototype.findAll],
    ['findOne', ExamController.prototype.findOne],
  ];

  it.each(handlers)('%s allows Admin, Principal, and Section Head', (_name, handler) => {
    expect(guard.canActivate(buildContext(ExamController, handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(ExamController, handler, RoleEnum.principal))).toBe(true);
    expect(guard.canActivate(buildContext(ExamController, handler, RoleEnum.section_head))).toBe(true);
  });

  it.each(handlers)('%s denies Teacher and Student', (_name, handler) => {
    expect(guard.canActivate(buildContext(ExamController, handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(ExamController, handler, RoleEnum.student))).toBe(false);
  });
});
