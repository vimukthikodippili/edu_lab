import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { EquipmentCategoryController } from './equipment-category.controller';
import { EquipmentController } from './equipment.controller';

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

describe('EquipmentCategoryController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('read route (findAll) — broad staff access', () => {
    const handler = EquipmentCategoryController.prototype.findAll;

    it('allows Admin, Principal, Section Head, and Teacher', () => {
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.teacher))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('management routes (create/update/delete) — admin, principal only', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', EquipmentCategoryController.prototype.create],
      ['update', EquipmentCategoryController.prototype.update],
      ['delete', EquipmentCategoryController.prototype.delete],
    ];

    it.each(handlers)('%s allows Admin and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Section Head and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(EquipmentCategoryController, handler, RoleEnum.teacher))).toBe(false);
    });
  });
});

describe('EquipmentController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('read routes (findByLab/findConditionHistory/generateReport/exportReport) — broad staff access', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['findByLab', EquipmentController.prototype.findByLab],
      ['findConditionHistory', EquipmentController.prototype.findConditionHistory],
      ['generateReport', EquipmentController.prototype.generateReport],
      ['exportReport', EquipmentController.prototype.exportReport],
    ];

    it.each(handlers)('%s allows Admin, Principal, Section Head, and Teacher', (_name, handler) => {
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.section_head))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.teacher))).toBe(true);
    });

    it.each(handlers)('%s denies Student and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('write routes (create/update/updateCondition/writeOff) — teacher, admin, principal at the guard level (real narrowing is the service ownership check)', () => {
    const handlers: [string, (...args: never[]) => unknown][] = [
      ['create', EquipmentController.prototype.create],
      ['update', EquipmentController.prototype.update],
      ['updateCondition', EquipmentController.prototype.updateCondition],
      ['writeOff', EquipmentController.prototype.writeOff],
    ];

    it.each(handlers)('%s allows Teacher, Admin, and Principal', (_name, handler) => {
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.teacher))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.principal))).toBe(true);
    });

    it.each(handlers)('%s denies Section Head, Student, and Guardian', (_name, handler) => {
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.section_head))).toBe(false);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(EquipmentController, handler, RoleEnum.guardian))).toBe(false);
    });
  });
});
