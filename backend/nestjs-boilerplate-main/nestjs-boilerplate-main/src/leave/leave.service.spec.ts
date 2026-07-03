import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { LeaveService } from './leave.service';
import { LeaveRequestEntity, LeaveStatus, LeaveType } from './entities/leave-request.entity';
import { LeaveApprovedEvent } from './events/leave-approved.event';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
  create: jest.fn((d: Partial<T>) => d as T),
});

const makeRequest = (overrides: Partial<LeaveRequestEntity> = {}): LeaveRequestEntity =>
  ({
    id: 'lr-1',
    staffId: 'staff-1',
    leaveType: LeaveType.MEDICAL,
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-03'),
    reason: 'Illness',
    status: LeaveStatus.PENDING,
    decidedById: null,
    decidedAt: null,
    decisionNote: null,
    staff: { id: 'staff-1', firstName: 'Nimal', lastName: 'Perera' },
    ...overrides,
  } as LeaveRequestEntity);

describe('LeaveService', () => {
  let service: LeaveService;
  let leaveRepo: MockRepo<LeaveRequestEntity>;
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    leaveRepo = repoMock<LeaveRequestEntity>();
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    notificationService = { createForStaff: jest.fn().mockResolvedValue(undefined) };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveService,
        { provide: getRepositoryToken(LeaveRequestEntity), useValue: leaveRepo },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<LeaveService>(LeaveService);
    jest.clearAllMocks();
    auditService.log.mockResolvedValue(undefined);
    notificationService.createForStaff.mockResolvedValue(undefined);
  });

  describe('decide()', () => {
    it('APPROVED — sets status to approved and emits leave.approved with correct data', async () => {
      const request = makeRequest();
      leaveRepo.findOne!.mockResolvedValue(request);
      leaveRepo.save!.mockImplementation((r: unknown) => Promise.resolve(r));

      const result = await service.decide('lr-1', LeaveStatus.APPROVED, 'principal-1', 'Looks good');

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(result.decidedById).toBe('principal-1');
      expect(result.decisionNote).toBe('Looks good');

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      const [eventName, event] = eventEmitter.emit.mock.calls[0] as [string, LeaveApprovedEvent];
      expect(eventName).toBe('leave.approved');
      expect(event).toBeInstanceOf(LeaveApprovedEvent);
      expect(event.leaveRequestId).toBe('lr-1');
      expect(event.staffId).toBe('staff-1');
      expect(event.leaveType).toBe(LeaveType.MEDICAL);
      expect(event.startDate).toEqual(new Date('2026-08-01'));
      expect(event.endDate).toEqual(new Date('2026-08-03'));
    });

    it('REJECTED — sets status to rejected and does NOT emit any event', async () => {
      const request = makeRequest();
      leaveRepo.findOne!.mockResolvedValue(request);
      leaveRepo.save!.mockImplementation((r: unknown) => Promise.resolve(r));

      const result = await service.decide('lr-1', LeaveStatus.REJECTED, 'principal-1', 'Insufficient cover');

      expect(result.status).toBe(LeaveStatus.REJECTED);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('already-decided request — throws BadRequestException without touching emit', async () => {
      leaveRepo.findOne!.mockResolvedValue(makeRequest({ status: LeaveStatus.APPROVED }));

      await expect(
        service.decide('lr-1', LeaveStatus.REJECTED, 'principal-1'),
      ).rejects.toThrow(BadRequestException);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('non-existent request — throws NotFoundException', async () => {
      leaveRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.decide('no-such-id', LeaveStatus.APPROVED, 'principal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
