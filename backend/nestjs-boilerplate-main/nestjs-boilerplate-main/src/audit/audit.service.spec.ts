import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { StaffEntity } from '../staff/entities/staff.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let staffRepo: { find: jest.Mock };

  beforeEach(async () => {
    auditRepo = {
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
      find: jest.fn(),
    };
    staffRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLogEntity), useValue: auditRepo },
        { provide: getRepositoryToken(StaffEntity), useValue: staffRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('creates and saves an audit entry with the given fields', async () => {
      await service.log({
        actorId: 'actor-1',
        action: 'approve',
        targetType: 'leave',
        targetId: 'target-1',
        reason: 'Looks good',
      });

      expect(auditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-1',
          action: 'approve',
          targetType: 'leave',
          targetId: 'target-1',
          reason: 'Looks good',
        }),
      );
      expect(auditRepo.save).toHaveBeenCalledTimes(1);
    });

    it('defaults reason to null when omitted', async () => {
      await service.log({ actorId: 'actor-1', action: 'approve', targetType: 'leave', targetId: 'target-1' });

      expect(auditRepo.create).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
    });
  });

  describe('findRecent', () => {
    it('returns an empty array without querying staff when there are no entries', async () => {
      auditRepo.find.mockResolvedValue([]);

      const result = await service.findRecent();

      expect(result).toEqual([]);
      expect(staffRepo.find).not.toHaveBeenCalled();
    });

    it('resolves actor names via a batch staff lookup', async () => {
      const createdAt = new Date('2026-08-12T00:00:00Z');
      auditRepo.find.mockResolvedValue([
        { id: 'log-1', actorId: 'staff-1', action: 'approve', targetType: 'leave', targetId: 't-1', reason: null, createdAt },
        { id: 'log-2', actorId: 'staff-2', action: 'reject', targetType: 'expense', targetId: 't-2', reason: 'Over budget', createdAt },
      ]);
      staffRepo.find.mockResolvedValue([
        { id: 'staff-1', firstName: 'Nimal', lastName: 'Silva' },
        { id: 'staff-2', firstName: 'Kamala', lastName: 'Perera' },
      ]);

      const result = await service.findRecent(15);

      expect(auditRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' }, take: 15 });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({ id: 'log-1', actorName: 'Nimal Silva', action: 'approve' }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ id: 'log-2', actorName: 'Kamala Perera', reason: 'Over budget' }),
      );
    });

    it('falls back to "Unknown" when the actor has no matching staff record', async () => {
      auditRepo.find.mockResolvedValue([
        { id: 'log-1', actorId: 'staff-missing', action: 'approve', targetType: 'leave', targetId: 't-1', reason: null, createdAt: new Date() },
      ]);
      staffRepo.find.mockResolvedValue([]);

      const result = await service.findRecent();

      expect(result[0].actorName).toBe('Unknown');
    });

    it('defaults to a limit of 15 when none is given', async () => {
      auditRepo.find.mockResolvedValue([]);

      await service.findRecent();

      expect(auditRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' }, take: 15 });
    });
  });
});
