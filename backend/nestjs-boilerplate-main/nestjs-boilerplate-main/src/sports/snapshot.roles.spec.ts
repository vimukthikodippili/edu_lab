import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { SnapshotController } from './snapshot.controller';

function buildContext(handler: (...args: never[]) => unknown, roleId: number): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => SnapshotController,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('SnapshotController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('findLatestSnapshots — visible to Principal, Section Head, and the Coach', () => {
    const handler = SnapshotController.prototype.findLatestSnapshots;

    it('allows Teacher, Section Head, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('recomputeNow — Admin/Principal only', () => {
    const handler = SnapshotController.prototype.recomputeNow;

    it('allows Admin and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Teacher and Section Head — a manual recompute is an ops action, not a coach one', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
    });
  });

  describe('getSchoolDashboard — Admin/Principal only', () => {
    const handler = SnapshotController.prototype.getSchoolDashboard;

    it('allows Admin and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Teacher, Section Head, and Coach — a school-wide overview is Principal territory, not per-sport coach access', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
    });
  });

  describe('getPublicSportsBoard — FR-P3-AV-07: no @Roles() restriction, any authenticated role', () => {
    const handler = SnapshotController.prototype.getPublicSportsBoard;

    it('allows every role in the system, since no @Roles() decorator is present', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.counselor))).toBe(true);
    });
  });

  describe('findAlerts (declining-performer inbox) — Coach/Admin/Principal only', () => {
    const handler = SnapshotController.prototype.findAlerts;

    it('allows Teacher, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Section Head, Student, and Guardian — a coach alert inbox is a coach-workflow tool, not a broad view surface', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('acknowledgeAlert — Coach/Admin/Principal only', () => {
    const handler = SnapshotController.prototype.acknowledgeAlert;

    it('allows Teacher, Admin, and Principal', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Section Head, Student, and Guardian', () => {
      expect(guard.canActivate(buildContext(handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
