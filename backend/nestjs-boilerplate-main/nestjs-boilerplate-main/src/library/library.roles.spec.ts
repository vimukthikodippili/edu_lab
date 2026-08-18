import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { LibraryController } from './library.controller';

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

describe('LibraryController — digital-book upload role restriction (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());
  const handler = LibraryController.prototype.createDigitalBook;

  it('allows every staff role', () => {
    for (const role of [
      RoleEnum.admin,
      RoleEnum.principal,
      RoleEnum.section_head,
      RoleEnum.teacher,
      RoleEnum.counselor,
      RoleEnum.security_officer,
      RoleEnum.librarian,
      RoleEnum.accountant,
      RoleEnum.school_psychologist,
    ]) {
      expect(guard.canActivate(buildContext(LibraryController, handler, role))).toBe(true);
    }
  });

  it('denies Student — self-service PDF upload is a staff-only capability', () => {
    expect(guard.canActivate(buildContext(LibraryController, handler, RoleEnum.student))).toBe(false);
  });

  it('denies Guardian', () => {
    expect(guard.canActivate(buildContext(LibraryController, handler, RoleEnum.guardian))).toBe(false);
  });

  it('still allows anyone to browse the digital library (GET has no @Roles restriction)', () => {
    const browseHandler = LibraryController.prototype.findDigitalBooks;
    expect(guard.canActivate(buildContext(LibraryController, browseHandler, RoleEnum.student))).toBe(true);
  });
});
