import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { PreRegisteredVisitorService } from './pre-registered-visitor.service';
import { PreRegisteredVisitorEntity } from './entities/pre-registered-visitor.entity';
import { VisitorType } from './entities/visitor.entity';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn((d: unknown) => d),
  save: jest.fn((d: unknown) => Promise.resolve({ id: 'generated', ...(d as object) })),
});

describe('PreRegisteredVisitorService', () => {
  let service: PreRegisteredVisitorService;
  let preRegRepo: MockRepo<PreRegisteredVisitorEntity>;

  beforeEach(async () => {
    preRegRepo = repoMock<PreRegisteredVisitorEntity>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreRegisteredVisitorService,
        { provide: getRepositoryToken(PreRegisteredVisitorEntity), useValue: preRegRepo },
      ],
    }).compile();

    service = module.get(PreRegisteredVisitorService);
  });

  describe('create', () => {
    it('creates a pre-registration attributed to the creating staff member', async () => {
      await service.create(
        {
          fullName: 'Dr. Anoma',
          visitorType: VisitorType.PARENT,
          purpose: 'Meeting about science fair',
          expectedDate: '2026-08-05',
          hostStaffId: 'host-1',
        },
        'creator-staff-1',
      );

      expect(preRegRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Dr. Anoma', hostStaffId: 'host-1', createdByStaffId: 'creator-staff-1' }),
      );
      expect(preRegRepo.save).toHaveBeenCalled();
    });
  });

  describe('findForToday', () => {
    it('queries only unconsumed records for today', async () => {
      await service.findForToday();
      const call = (preRegRepo.find as jest.Mock).mock.calls[0][0];
      expect(call.where.consumedVisitorLogId).toBeDefined();
      expect(call.where.expectedDate).toBe(new Date().toISOString().split('T')[0]);
    });
  });

  describe('search', () => {
    it('filters by a case-insensitive partial name match, excluding consumed records', async () => {
      await service.search('Anoma');
      const call = (preRegRepo.find as jest.Mock).mock.calls[0][0];
      expect(call.where.consumedVisitorLogId).toBeDefined();
      expect(call.where.fullName).toBeDefined();
    });
  });
});
