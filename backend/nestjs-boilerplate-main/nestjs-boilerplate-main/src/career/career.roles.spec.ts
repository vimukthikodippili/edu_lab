import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { CareerController } from './career.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => CareerController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('CareerController — role-based access control (real RolesGuard + real Reflector), Student-only throughout', () => {
  const guard = new RolesGuard(new Reflector());
  const handlers = [
    CareerController.prototype.getOceanQuestions,
    CareerController.prototype.getRiasecQuestions,
    CareerController.prototype.submitOcean,
    CareerController.prototype.submitRiasec,
    CareerController.prototype.findMyResults,
  ];

  it.each(handlers.map((h) => [h.name, h]))('%s allows a Student caller', (_name, handler) => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
  });

  it.each(handlers.map((h) => [h.name, h]))(
    '%s denies Teacher, Guardian, Principal, and Counselor callers — this is a student self-assessment, not a staff or guardian view',
    (_name, handler) => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(false);
    },
  );
});

describe('GET /career/results/by-user/:userId — Counselor/Principal-only review path (FR-CE-04)', () => {
  const guard = new RolesGuard(new Reflector());
  const handler = CareerController.prototype.findForUser;

  it('allows Counselor and Principal callers', () => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(true);
    expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
  });

  it('denies Student, Guardian, and Teacher callers', () => {
    expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
  });
});
