import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentSportsController } from './student-sports.controller';
import { StudentSportsService } from './student-sports.service';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../students/entities/student-guardian.entity';
import { RoleEnum } from '../roles/roles.enum';

describe('StudentSportsController — self-view IDOR fix (the explicitly-requested test)', () => {
  let controller: StudentSportsController;
  let studentRepo: { findOne: jest.Mock };
  let guardianRepo: { findOne: jest.Mock };
  let sgRepo: { find: jest.Mock };
  let studentSportsService: { getMyProfile: jest.Mock };

  const makeReq = (roleId: number, userId: unknown = 1) => ({
    user: { id: userId, role: { id: roleId } },
  });

  beforeEach(async () => {
    studentRepo = { findOne: jest.fn() };
    guardianRepo = { findOne: jest.fn() };
    sgRepo = { find: jest.fn() };
    studentSportsService = { getMyProfile: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentSportsController],
      providers: [
        { provide: StudentSportsService, useValue: studentSportsService },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
      ],
    }).compile();

    controller = module.get<StudentSportsController>(StudentSportsController);
  });

  describe('student caller', () => {
    it('throws 404 when the caller has no linked student record', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.getMyPerformance(undefined, makeReq(RoleEnum.student, 5)),
      ).rejects.toThrow(NotFoundException);
    });

    it('defaults to the caller\'s own studentId when none is supplied', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'my-real-student-id' });
      studentSportsService.getMyProfile.mockResolvedValue([]);

      await controller.getMyPerformance(undefined, makeReq(RoleEnum.student, 5));

      expect(studentSportsService.getMyProfile).toHaveBeenCalledWith('my-real-student-id');
    });

    it('succeeds when the queried studentId matches the caller\'s own', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'my-real-student-id' });
      studentSportsService.getMyProfile.mockResolvedValue([{ sport: { id: 's1' } }]);

      const result = await controller.getMyPerformance(
        'my-real-student-id',
        makeReq(RoleEnum.student, 5),
      );

      expect(result).toEqual([{ sport: { id: 's1' } }]);
    });

    it('rejects (the explicitly-requested test) when the queried studentId does not match the authenticated user', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'my-real-student-id' });

      await expect(
        controller.getMyPerformance('someone-elses-id', makeReq(RoleEnum.student, 5)),
      ).rejects.toThrow(ForbiddenException);
      expect(studentSportsService.getMyProfile).not.toHaveBeenCalled();
    });
  });

  describe('guardian caller — must own the requested student', () => {
    it('throws 404 when the caller has no linked guardian record', async () => {
      guardianRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.getMyPerformance('some-student-id', makeReq(RoleEnum.guardian, 9)),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when no studentId is supplied — a guardian must specify which child', async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });

      await expect(
        controller.getMyPerformance(undefined, makeReq(RoleEnum.guardian, 9)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws 403 when the requested studentId is not one of the guardian\'s own children', async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
      sgRepo.find.mockResolvedValue([{ studentId: 'my-actual-child-id' }]);

      await expect(
        controller.getMyPerformance('not-my-child', makeReq(RoleEnum.guardian, 9)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the request when the studentId is genuinely one of the guardian\'s own children', async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
      sgRepo.find.mockResolvedValue([{ studentId: 'my-actual-child-id' }]);
      studentSportsService.getMyProfile.mockResolvedValue([{ sport: { id: 's1' } }]);

      const result = await controller.getMyPerformance(
        'my-actual-child-id',
        makeReq(RoleEnum.guardian, 9),
      );

      expect(result).toEqual([{ sport: { id: 's1' } }]);
      expect(studentSportsService.getMyProfile).toHaveBeenCalledWith('my-actual-child-id');
    });
  });
});
