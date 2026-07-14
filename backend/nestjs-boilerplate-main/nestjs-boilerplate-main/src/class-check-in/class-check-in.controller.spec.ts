import 'reflect-metadata';
import { MethodNotAllowedException } from '@nestjs/common';
import { ClassCheckInController } from './class-check-in.controller';
import { RoleEnum } from '../roles/roles.enum';

describe('ClassCheckInController', () => {
  let controller: ClassCheckInController;
  let classCheckInService: { findForAudit: jest.Mock };
  let usersService: { findById: jest.Mock };
  let staffService: { findByEmail: jest.Mock };

  beforeEach(() => {
    classCheckInService = { findForAudit: jest.fn().mockResolvedValue([]) };
    usersService = { findById: jest.fn() };
    staffService = { findByEmail: jest.fn() };

    controller = new ClassCheckInController(
      classCheckInService as never,
      usersService as never,
      staffService as never,
    );
  });

  describe('append-only audit trail (FR-P2-CI-04)', () => {
    it('PATCH :id always throws MethodNotAllowedException (405), never touching the service', () => {
      expect(() => controller.update()).toThrow(MethodNotAllowedException);
      expect(classCheckInService.findForAudit).not.toHaveBeenCalled();
    });

    it('DELETE :id always throws MethodNotAllowedException (405), never touching the service', () => {
      expect(() => controller.remove()).toThrow(MethodNotAllowedException);
      expect(classCheckInService.findForAudit).not.toHaveBeenCalled();
    });

    it('the audit route is restricted to admin/principal roles', () => {
      const roles = Reflect.getMetadata('roles', ClassCheckInController.prototype.audit);
      expect(roles).toEqual([RoleEnum.admin, RoleEnum.principal]);
    });
  });

  describe('audit', () => {
    it('passes the query straight through to findForAudit and returns its result', async () => {
      const records = [{ id: 'checkin-1' }];
      classCheckInService.findForAudit.mockResolvedValue(records);
      const query = { teacherId: 'teacher-1', classSectionId: 27 };

      const result = await controller.audit(query as never);

      expect(classCheckInService.findForAudit).toHaveBeenCalledWith(query);
      expect(result).toBe(records);
    });
  });
});
