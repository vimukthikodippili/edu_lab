import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MarkCorrectionService } from './mark-correction.service';
import {
  MarkCorrectionRequestEntity,
  MarkCorrectionStatus,
} from '../entities/mark-correction-request.entity';
import { MarkEntity } from '../entities/mark.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notification/notification.service';

describe('MarkCorrectionService', () => {
  let service: MarkCorrectionService;
  let correctionRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let markRepo: { findOne: jest.Mock; save: jest.Mock };
  let auditService: { log: jest.Mock };
  let notificationService: { createForStaff: jest.Mock };

  beforeEach(async () => {
    correctionRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      create: jest.fn().mockImplementation((d) => d),
    };
    markRepo = { findOne: jest.fn(), save: jest.fn() };
    auditService = { log: jest.fn() };
    notificationService = { createForStaff: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkCorrectionService,
        { provide: getRepositoryToken(MarkCorrectionRequestEntity), useValue: correctionRepo },
        { provide: getRepositoryToken(MarkEntity), useValue: markRepo },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<MarkCorrectionService>(MarkCorrectionService);
  });

  describe('create', () => {
    it('throws NotFoundException for an unknown mark', async () => {
      markRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('mark-1', 'teacher-1', { correctedScore: 40, reason: 'typo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects a corrected score above the mark maximum', async () => {
      markRepo.findOne.mockResolvedValue({ id: 'mark-1', maxScore: 50, score: '30.00' } as MarkEntity);

      await expect(
        service.create('mark-1', 'teacher-1', { correctedScore: 60, reason: 'typo' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects a second pending request against the same mark', async () => {
      markRepo.findOne.mockResolvedValue({ id: 'mark-1', maxScore: 50, score: '30.00' } as MarkEntity);
      correctionRepo.findOne.mockResolvedValue({ id: 'existing-request', status: MarkCorrectionStatus.PENDING });

      await expect(
        service.create('mark-1', 'teacher-1', { correctedScore: 40, reason: 'typo' }),
      ).rejects.toThrow(ConflictException);
      expect(correctionRepo.save).not.toHaveBeenCalled();
    });

    it('captures the original score and saves a pending request', async () => {
      markRepo.findOne.mockResolvedValue({ id: 'mark-1', maxScore: 50, score: '30.00' } as MarkEntity);
      correctionRepo.findOne.mockResolvedValue(null);

      const result = await service.create('mark-1', 'teacher-1', {
        correctedScore: 40,
        reason: 'Miscounted a section',
      });

      expect(result.originalScore).toBe('30.00');
      expect(result.correctedScore).toBe('40');
      expect(result.status).toBe(MarkCorrectionStatus.PENDING);
      expect(correctionRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('decide', () => {
    it('throws NotFoundException for an unknown request', async () => {
      correctionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.decide('req-1', MarkCorrectionStatus.APPROVED, 'principal-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the request is already decided', async () => {
      correctionRepo.findOne.mockResolvedValue({
        id: 'req-1',
        status: MarkCorrectionStatus.APPROVED,
      });

      await expect(
        service.decide('req-1', MarkCorrectionStatus.APPROVED, 'principal-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('on approve, writes the corrected score onto the mark and logs an audit entry', async () => {
      correctionRepo.findOne.mockResolvedValue({
        id: 'req-1',
        markId: 'mark-1',
        requestedByTeacherId: 'teacher-1',
        originalScore: '30.00',
        correctedScore: '40',
        status: MarkCorrectionStatus.PENDING,
      });
      markRepo.findOne.mockResolvedValue({
        id: 'mark-1',
        studentId: 'student-1',
        assessmentId: 'assessment-1',
        score: '30.00',
      } as MarkEntity);

      await service.decide('req-1', MarkCorrectionStatus.APPROVED, 'principal-1', 'Verified against paper');

      expect(markRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'mark-1', score: '40' }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'principal-1',
          action: 'approve',
          targetType: 'mark_correction',
          targetId: 'req-1',
          reason: expect.stringContaining('30.00 to 40'),
        }),
      );
      expect(notificationService.createForStaff).toHaveBeenCalledTimes(1);
    });

    it('on reject, leaves the mark untouched but still logs an audit entry', async () => {
      correctionRepo.findOne.mockResolvedValue({
        id: 'req-1',
        markId: 'mark-1',
        requestedByTeacherId: 'teacher-1',
        originalScore: '30.00',
        correctedScore: '40',
        status: MarkCorrectionStatus.PENDING,
      });
      markRepo.findOne.mockResolvedValue({
        id: 'mark-1',
        studentId: 'student-1',
        assessmentId: 'assessment-1',
        score: '30.00',
      } as MarkEntity);

      await service.decide('req-1', MarkCorrectionStatus.REJECTED, 'principal-1');

      expect(markRepo.save).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'reject', targetType: 'mark_correction' }),
      );
    });
  });
});
