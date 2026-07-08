import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException, NotFoundException } from '@nestjs/common';
import { TeacherPerformanceController } from './teacher-performance.controller';
import { TeacherPerformanceService } from './teacher-performance.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';

describe('TeacherPerformanceController — self-only access restriction', () => {
  let controller: TeacherPerformanceController;
  let usersService: { findById: jest.Mock };
  let staffService: { findByEmail: jest.Mock; findById: jest.Mock };
  let teacherPerformanceService: { getMyPerformance: jest.Mock; getPerformanceForStaff: jest.Mock };

  const userAToStaffA = { userId: 1, email: 'teacher-a@sims.edu.lk', staffId: 'staff-aaa' };
  const userBToStaffB = { userId: 2, email: 'teacher-b@sims.edu.lk', staffId: 'staff-bbb' };

  beforeEach(async () => {
    usersService = {
      findById: jest.fn().mockImplementation((id: number) => {
        if (id === userAToStaffA.userId) return Promise.resolve({ id, email: userAToStaffA.email });
        if (id === userBToStaffB.userId) return Promise.resolve({ id, email: userBToStaffB.email });
        return Promise.resolve(null);
      }),
    };
    staffService = {
      findByEmail: jest.fn().mockImplementation((email: string) => {
        if (email === userAToStaffA.email) return Promise.resolve({ id: userAToStaffA.staffId });
        if (email === userBToStaffB.email) return Promise.resolve({ id: userBToStaffB.staffId });
        return Promise.resolve(null);
      }),
      findById: jest.fn(),
    };
    // Echoes back whichever teacherId it was actually invoked with — lets the test prove
    // the controller always resolves the CALLER's own id, never an id supplied by the caller
    // (there is no parameter on the route through which one could be supplied at all).
    teacherPerformanceService = {
      getMyPerformance: jest.fn().mockImplementation((teacherId: string) =>
        Promise.resolve({ resolvedTeacherId: teacherId }),
      ),
      getPerformanceForStaff: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeacherPerformanceController],
      providers: [
        { provide: TeacherPerformanceService, useValue: teacherPerformanceService },
        { provide: UsersService, useValue: usersService },
        { provide: StaffService, useValue: staffService },
      ],
    }).compile();

    controller = module.get<TeacherPerformanceController>(TeacherPerformanceController);
  });

  it("resolves each caller's own staff id from their JWT identity, never another teacher's", async () => {
    const resultA = await controller.getMyPerformance({ user: { id: userAToStaffA.userId } });
    const resultB = await controller.getMyPerformance({ user: { id: userBToStaffB.userId } });

    expect(teacherPerformanceService.getMyPerformance).toHaveBeenNthCalledWith(1, userAToStaffA.staffId);
    expect(teacherPerformanceService.getMyPerformance).toHaveBeenNthCalledWith(2, userBToStaffB.staffId);
    expect(resultA).toEqual({ resolvedTeacherId: userAToStaffA.staffId });
    expect(resultB).toEqual({ resolvedTeacherId: userBToStaffB.staffId });
    // The route method takes only the request object — there is no staffId/teacherId
    // parameter through which a caller could ask for another teacher's dashboard.
    expect(controller.getMyPerformance.length).toBe(1);
  });

  it('throws UnprocessableEntityException when the JWT user has no linked staff record', async () => {
    staffService.findByEmail.mockResolvedValue(null);

    await expect(
      controller.getMyPerformance({ user: { id: userAToStaffA.userId } }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(teacherPerformanceService.getMyPerformance).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the JWT user id does not resolve to a user', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      controller.getMyPerformance({ user: { id: 999 } }),
    ).rejects.toThrow(NotFoundException);
    expect(teacherPerformanceService.getMyPerformance).not.toHaveBeenCalled();
  });

  describe('getStaffPerformance — principal/section-head viewing any teacher', () => {
    it('validates the target staff id, fetches their dashboard, and includes their display name', async () => {
      staffService.findById.mockResolvedValue({ id: 'target-staff-id', firstName: 'Nimal', lastName: 'Perera' });
      teacherPerformanceService.getPerformanceForStaff.mockResolvedValue({
        attendance: { monthly: [], overall: { totalMarkedDays: 0, presentRate: 0, punctualityRate: 0 } },
        classResults: [],
        syllabus: { bySubject: [], overallCompletionPercent: 0 },
        behindScheduleOutlier: false,
      });

      const result = await controller.getStaffPerformance('target-staff-id');

      expect(staffService.findById).toHaveBeenCalledWith('target-staff-id');
      expect(teacherPerformanceService.getPerformanceForStaff).toHaveBeenCalledWith('target-staff-id');
      expect(result.teacher).toEqual({ id: 'target-staff-id', firstName: 'Nimal', lastName: 'Perera' });
      expect(result.behindScheduleOutlier).toBe(false);
    });

    it('propagates NotFoundException from StaffService when the target staff id does not exist', async () => {
      staffService.findById.mockRejectedValue(new NotFoundException('Staff member not found.'));

      await expect(controller.getStaffPerformance('bogus-id')).rejects.toThrow(NotFoundException);
      expect(teacherPerformanceService.getPerformanceForStaff).not.toHaveBeenCalled();
    });
  });
});
