import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { LabOverviewController } from './lab-overview.controller';

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

describe('LabOverviewController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  const handlers: [string, (...args: never[]) => unknown][] = [
    ['getDashboard', LabOverviewController.prototype.getDashboard],
    ['getUtilisation', LabOverviewController.prototype.getUtilisation],
    ['getEquipmentHealth', LabOverviewController.prototype.getEquipmentHealth],
    ['getExperimentCoverage', LabOverviewController.prototype.getExperimentCoverage],
    ['getLabReportPerformance', LabOverviewController.prototype.getLabReportPerformance],
  ];

  it.each(handlers)('%s allows Admin and Principal', (_name, handler) => {
    expect(guard.canActivate(buildContext(LabOverviewController, handler, RoleEnum.admin))).toBe(true);
    expect(guard.canActivate(buildContext(LabOverviewController, handler, RoleEnum.principal))).toBe(true);
  });

  it.each(handlers)('%s denies Section Head, Teacher, Student, and Guardian', (_name, handler) => {
    expect(guard.canActivate(buildContext(LabOverviewController, handler, RoleEnum.section_head))).toBe(false);
    expect(guard.canActivate(buildContext(LabOverviewController, handler, RoleEnum.teacher))).toBe(false);
    expect(guard.canActivate(buildContext(LabOverviewController, handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(LabOverviewController, handler, RoleEnum.guardian))).toBe(false);
  });
});
