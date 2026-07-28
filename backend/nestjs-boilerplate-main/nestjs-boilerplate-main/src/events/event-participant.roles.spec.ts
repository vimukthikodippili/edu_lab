import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { EventParticipantController } from './event-participant.controller';

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

describe('EventParticipantController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  describe('addParticipants — Admin and Principal only', () => {
    const handler = EventParticipantController.prototype.addParticipants;

    it('allows Admin and Principal', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.principal))).toBe(true);
    });

    it('denies Teacher and Student', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.teacher))).toBe(false);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.student))).toBe(false);
    });
  });

  describe('listParticipants — Admin, Principal, and Teacher', () => {
    const handler = EventParticipantController.prototype.listParticipants;

    it('allows Admin, Principal, and Teacher', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.admin))).toBe(true);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.principal))).toBe(true);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.teacher))).toBe(true);
    });

    it('denies Student and Guardian', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.student))).toBe(false);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.guardian))).toBe(false);
    });
  });

  describe('myParticipation — Student only', () => {
    const handler = EventParticipantController.prototype.myParticipation;

    it('allows Student', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.student))).toBe(true);
    });

    it('denies Guardian, Admin, and Teacher', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.guardian))).toBe(false);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.teacher))).toBe(false);
    });
  });

  describe('bulkCheckIn — Teacher only', () => {
    const handler = EventParticipantController.prototype.bulkCheckIn;

    it('allows Teacher', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.teacher))).toBe(true);
    });

    it('denies Admin, Principal, and Student', () => {
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.admin))).toBe(false);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.principal))).toBe(false);
      expect(guard.canActivate(buildContext(EventParticipantController, handler, RoleEnum.student))).toBe(false);
    });
  });
});
