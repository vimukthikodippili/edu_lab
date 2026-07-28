import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { AssessmentMatrixController } from './assessment-matrix.controller';

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

describe('AssessmentMatrixController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['findAll', AssessmentMatrixController.prototype.findAll],
    ['exportPdf', AssessmentMatrixController.prototype.exportPdf],
  ];

  it.each(handlers)('%s allows Admin, Counselor, and School Psychologist', (_name, handler) => {
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.counselor))).toBe(true);
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.school_psychologist))).toBe(true);
  });

  it.each(handlers)('%s denies Principal and Teacher (narrower than disorder-registry read routes — AI prompt is explicit)', (_name, handler) => {
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.principal))).toBe(false);
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.teacher))).toBe(false);
  });

  it.each(handlers)('%s denies Section Head, Student, and Guardian', (_name, handler) => {
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.section_head))).toBe(false);
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(AssessmentMatrixController, handler, RoleEnum.guardian))).toBe(false);
  });
});
