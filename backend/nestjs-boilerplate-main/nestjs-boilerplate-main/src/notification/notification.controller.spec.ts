import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { UsersService } from '../users/users.service';
import { StaffService } from '../staff/staff.service';
import { StudentEntity } from '../students/entities/student.entity';
import { GuardianEntity } from '../students/entities/guardian.entity';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: jest.Mocked<NotificationService>;
  let usersService: jest.Mocked<UsersService>;
  let staffService: jest.Mocked<StaffService>;
  let studentRepo: { findOne: jest.Mock };
  let guardianRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            findForStaff: jest.fn(),
            getUnreadCount: jest.fn(),
            markRead: jest.fn(),
            findForGuardian: jest.fn(),
            getGuardianUnreadCount: jest.fn(),
            markReadForGuardian: jest.fn(),
            findForStudent: jest.fn(),
            getStudentUnreadCount: jest.fn(),
            markReadForStudent: jest.fn(),
          },
        },
        { provide: UsersService, useValue: { findById: jest.fn() } },
        { provide: StaffService, useValue: { findByEmail: jest.fn() } },
        {
          provide: getRepositoryToken(StudentEntity),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(GuardianEntity),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(NotificationController);
    service = module.get(NotificationService);
    usersService = module.get(UsersService);
    staffService = module.get(StaffService);
    studentRepo = module.get(getRepositoryToken(StudentEntity));
    guardianRepo = module.get(getRepositoryToken(GuardianEntity));
  });

  describe('staff routes', () => {
    it("resolves the caller's own staffId from the JWT and never from client input", async () => {
      usersService.findById.mockResolvedValue({ email: 'me@school.test' } as never);
      staffService.findByEmail.mockResolvedValue({ id: 'staff-self' } as never);
      service.findForStaff.mockResolvedValue([] as never);

      await controller.list({ user: { id: 42 } });

      expect(usersService.findById).toHaveBeenCalledWith(42);
      expect(staffService.findByEmail).toHaveBeenCalledWith('me@school.test');
      expect(service.findForStaff).toHaveBeenCalledWith('staff-self');
    });

    it('rejects a caller with no linked staff record instead of falling back to any ID', async () => {
      usersService.findById.mockResolvedValue({ email: 'me@school.test' } as never);
      staffService.findByEmail.mockResolvedValue(null);

      await expect(controller.list({ user: { id: 42 } })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(service.findForStaff).not.toHaveBeenCalled();
    });

    it('markRead scopes to the resolved staffId, not any ID supplied by the caller', async () => {
      usersService.findById.mockResolvedValue({ email: 'me@school.test' } as never);
      staffService.findByEmail.mockResolvedValue({ id: 'staff-self' } as never);
      service.markRead.mockResolvedValue({} as never);

      await controller.markRead(7, { user: { id: 42 } });

      expect(service.markRead).toHaveBeenCalledWith(7, 'staff-self');
    });
  });

  describe('guardian routes', () => {
    it("resolves the caller's own guardianId from the JWT, closing the prior guardianId-query-param IDOR", async () => {
      guardianRepo.findOne.mockResolvedValue({ id: 'guardian-self' });
      service.findForGuardian.mockResolvedValue([] as never);

      await controller.listForGuardian({ user: { id: 99 } });

      expect(guardianRepo.findOne).toHaveBeenCalledWith({ where: { userId: 99 } });
      expect(service.findForGuardian).toHaveBeenCalledWith('guardian-self');
    });

    it('rejects a caller with no linked guardian record', async () => {
      guardianRepo.findOne.mockResolvedValue(null);

      await expect(controller.guardianUnreadCount({ user: { id: 99 } })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  describe('student routes', () => {
    it("resolves the caller's own studentId from the JWT, closing the prior studentId-query-param IDOR", async () => {
      studentRepo.findOne.mockResolvedValue({ id: 'student-self' });
      service.markReadForStudent.mockResolvedValue({} as never);

      await controller.markStudentRead(3, { user: { id: 7 } });

      expect(studentRepo.findOne).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(service.markReadForStudent).toHaveBeenCalledWith(3, 'student-self');
    });

    it('rejects a caller with no linked student record', async () => {
      studentRepo.findOne.mockResolvedValue(null);

      await expect(controller.listForStudent({ user: { id: 7 } })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  it('surfaces NotFoundException for a caller whose user record is missing entirely', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(controller.list({ user: { id: 1 } })).rejects.toBeInstanceOf(NotFoundException);
  });
});
