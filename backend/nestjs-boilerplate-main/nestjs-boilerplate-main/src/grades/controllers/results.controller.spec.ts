import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResultsController } from './results.controller';
import { ResultsQueryService } from '../services/results-query.service';
import { ResultPublishingService } from '../services/result-publishing.service';
import { UsersService } from '../../users/users.service';
import { StaffService } from '../../staff/staff.service';
import { StudentEntity } from '../../students/entities/student.entity';
import { GuardianEntity } from '../../students/entities/guardian.entity';
import { StudentGuardianEntity } from '../../students/entities/student-guardian.entity';
import { RoleEnum } from '../../roles/roles.enum';

describe('ResultsController — published-results IDOR fix', () => {
  let controller: ResultsController;
  let studentRepo: { findOne: jest.Mock };
  let guardianRepo: { findOne: jest.Mock };
  let sgRepo: { find: jest.Mock };
  let resultPublishingService: {
    getPublishedTermResultForStudent: jest.Mock;
    getPublishedSubjectResultsForStudent: jest.Mock;
  };

  const makeReq = (roleId: number, userId: unknown = 1) => ({
    user: { id: userId, role: { id: roleId } },
  });

  beforeEach(async () => {
    studentRepo = { findOne: jest.fn() };
    guardianRepo = { findOne: jest.fn() };
    sgRepo = { find: jest.fn() };
    resultPublishingService = {
      getPublishedTermResultForStudent: jest.fn(),
      getPublishedSubjectResultsForStudent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [
        { provide: ResultsQueryService, useValue: {} },
        { provide: ResultPublishingService, useValue: resultPublishingService },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: StaffService, useValue: { findByEmail: jest.fn() } },
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepo },
        { provide: getRepositoryToken(GuardianEntity), useValue: guardianRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useValue: sgRepo },
      ],
    }).compile();

    controller = module.get<ResultsController>(ResultsController);
  });

  describe('student caller — always self-resolved, client studentId ignored', () => {
    it('resolves to the caller\'s own studentId regardless of the query param, and rejects if unlinked', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.getPublishedTermResult('someone-elses-id', '1', makeReq(RoleEnum.student, 5)),
      ).rejects.toThrow(NotFoundException);
    });

    it('uses the resolved own studentId, not the requested one, when calling the service', async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'my-real-student-id' });
      resultPublishingService.getPublishedTermResultForStudent.mockResolvedValue({ id: 'result-1' });

      await controller.getPublishedTermResult('someone-elses-id', '1', makeReq(RoleEnum.student, 5));

      expect(resultPublishingService.getPublishedTermResultForStudent).toHaveBeenCalledWith(
        'my-real-student-id',
        1,
      );
    });
  });

  describe('guardian caller — must own the requested student', () => {
    it('throws 404 when the caller has no linked guardian record', async () => {
      guardianRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.getPublishedTermResult('some-student-id', '1', makeReq(RoleEnum.guardian, 9)),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 403 (the IDOR fix) when the requested studentId is not one of the guardian\'s own children', async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
      sgRepo.find.mockResolvedValue([{ studentId: 'my-actual-child-id' }]);

      await expect(
        controller.getPublishedTermResult('some-other-students-id', '1', makeReq(RoleEnum.guardian, 9)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the request when the studentId is genuinely one of the guardian\'s own children', async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
      sgRepo.find.mockResolvedValue([{ studentId: 'my-actual-child-id' }]);
      resultPublishingService.getPublishedTermResultForStudent.mockResolvedValue({ id: 'result-1' });

      const result = await controller.getPublishedTermResult(
        'my-actual-child-id',
        '1',
        makeReq(RoleEnum.guardian, 9),
      );

      expect(result).toEqual({ id: 'result-1' });
      expect(resultPublishingService.getPublishedTermResultForStudent).toHaveBeenCalledWith(
        'my-actual-child-id',
        1,
      );
    });
  });

  describe('getPublishedSubjectResults — same protection applied', () => {
    it('rejects a guardian requesting a student that is not theirs', async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-1' });
      sgRepo.find.mockResolvedValue([{ studentId: 'my-actual-child-id' }]);

      await expect(
        controller.getPublishedSubjectResults('not-my-child', '1', makeReq(RoleEnum.guardian, 9)),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
