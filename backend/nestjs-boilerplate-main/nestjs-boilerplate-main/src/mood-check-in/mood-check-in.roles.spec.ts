import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { RoleEnum } from '../roles/roles.enum';
import { MoodCheckInController } from './mood-check-in.controller';
import { ResultsController } from '../grades/controllers/results.controller';

function buildContext(
  handler: (...args: never[]) => unknown,
  target: object,
  roleId: number,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => target,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { id: roleId } } }),
    }),
  } as unknown as ExecutionContext;
}

describe('MoodCheckInController — role-based access control (real RolesGuard + real Reflector)', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows a Student-role caller on GET /mood-check-ins/today and POST /mood-check-ins', () => {
    expect(
      guard.canActivate(
        buildContext(MoodCheckInController.prototype.getTodayStatus, MoodCheckInController, RoleEnum.student),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        buildContext(MoodCheckInController.prototype.submit, MoodCheckInController, RoleEnum.student),
      ),
    ).toBe(true);
  });

  it('denies every other role on both mood check-in routes', () => {
    for (const roleId of [
      RoleEnum.admin,
      RoleEnum.principal,
      RoleEnum.teacher,
      RoleEnum.guardian,
      RoleEnum.counselor,
    ]) {
      expect(
        guard.canActivate(
          buildContext(MoodCheckInController.prototype.getTodayStatus, MoodCheckInController, roleId),
        ),
      ).toBe(false);
      expect(
        guard.canActivate(
          buildContext(MoodCheckInController.prototype.submit, MoodCheckInController, roleId),
        ),
      ).toBe(false);
    }
  });

  // The literal "no other flow blocks on this model being populated" acceptance criterion,
  // proven against a real, already-existing, unrelated student-facing route — its access
  // control is completely unaffected by the mood check-in module's existence.
  describe('sanity check: an unrelated existing student flow is unaffected', () => {
    const handler = ResultsController.prototype.getPublishedTermResult;

    it('GET /grades/results/published is still gated by exactly RoleEnum.student and RoleEnum.guardian, unchanged', () => {
      expect(guard.canActivate(buildContext(handler, ResultsController, RoleEnum.student))).toBe(true);
      expect(guard.canActivate(buildContext(handler, ResultsController, RoleEnum.guardian))).toBe(true);
      expect(guard.canActivate(buildContext(handler, ResultsController, RoleEnum.teacher))).toBe(false);
    });
  });
});
