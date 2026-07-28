import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { DomainResultService } from './domain-result.service';
import { DomainResultEntity, DomainResultLevel } from './entities/domain-result.entity';
import { MhaSessionEntity, MhaSessionStatus } from '../mha-session/entities/mha-session.entity';
import { DisorderRegistryEntity } from '../disorder-registry/entities/disorder-registry.entity';
import { AuditService } from '../audit/audit.service';
import { DomainResultNoteCryptoService } from './domain-result-note-crypto.service';
import { SafetyFlagEscalationService } from './safety-flag-escalation.service';
import { CRISIS_RESOURCES } from './config/crisis-resources.config';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const repoMock = <T extends ObjectLiteral>(): MockRepo<T> => ({
  findOne: jest.fn(),
  save: jest.fn((d: unknown) => Promise.resolve(d)),
});

const SESSION_ID = 'session-uuid';
const ROW_ID = 'domain-result-uuid';
const STAFF_ID = 'counselor-staff-uuid';

function buildRow(overrides: Partial<DomainResultEntity> = {}): DomainResultEntity {
  return {
    id: ROW_ID,
    sessionId: SESSION_ID,
    domainId: 'domain-depression',
    level: DomainResultLevel.NOT_ASSESSED,
    checkedSymptoms: [],
    counselorNotesCiphertext: null,
    counselorNotesIv: null,
    counselorNotesAuthTag: null,
    safetyFlagRaised: false,
    assessedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as DomainResultEntity;
}

describe('DomainResultService', () => {
  let service: DomainResultService;
  let domainResultRepo: MockRepo<DomainResultEntity>;
  let sessionRepo: MockRepo<MhaSessionEntity>;
  let disorderRegistryRepo: MockRepo<DisorderRegistryEntity>;
  let auditService: { log: jest.Mock };
  let cryptoService: { encrypt: jest.Mock; decrypt: jest.Mock };
  let safetyFlagEscalationService: { escalate: jest.Mock };
  let listGetManyResult: DomainResultEntity[];

  const buildListQb = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(() => Promise.resolve(listGetManyResult)),
  });

  beforeEach(async () => {
    domainResultRepo = repoMock<DomainResultEntity>();
    sessionRepo = repoMock<MhaSessionEntity>();
    sessionRepo.findOne!.mockResolvedValue({
      id: SESSION_ID,
      counselorStaffId: STAFF_ID,
      studentId: 'student-uuid',
      caseNumber: 'SC-20260723-001',
      status: MhaSessionStatus.DRAFT,
    });

    disorderRegistryRepo = repoMock<DisorderRegistryEntity>();
    disorderRegistryRepo.findOne!.mockResolvedValue({ id: 'domain-depression', safetyFlag: true });

    listGetManyResult = [];
    domainResultRepo.createQueryBuilder = jest.fn(() => buildListQb() as never);

    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    cryptoService = {
      encrypt: jest.fn().mockReturnValue({ ciphertext: 'CIPHER', iv: 'IV_HEX', authTag: 'TAG_HEX' }),
      decrypt: jest.fn().mockReturnValue('decrypted plaintext'),
    };

    safetyFlagEscalationService = {
      escalate: jest.fn().mockResolvedValue(CRISIS_RESOURCES),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainResultService,
        { provide: getRepositoryToken(DomainResultEntity), useValue: domainResultRepo },
        { provide: getRepositoryToken(MhaSessionEntity), useValue: sessionRepo },
        { provide: getRepositoryToken(DisorderRegistryEntity), useValue: disorderRegistryRepo },
        { provide: AuditService, useValue: auditService },
        { provide: DomainResultNoteCryptoService, useValue: cryptoService },
        { provide: SafetyFlagEscalationService, useValue: safetyFlagEscalationService },
      ],
    }).compile();

    service = module.get<DomainResultService>(DomainResultService);
  });

  describe('update — session immutability (MHA-123, AI-prompt test b)', () => {
    it('rejects any edit when the parent session is complete', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        id: SESSION_ID,
        counselorStaffId: STAFF_ID,
        studentId: 'student-uuid',
        caseNumber: 'SC-20260723-001',
        status: MhaSessionStatus.COMPLETE,
      });
      domainResultRepo.findOne!.mockResolvedValue(buildRow());

      await expect(
        service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.LOW }, STAFF_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(domainResultRepo.save).not.toHaveBeenCalled();
    });

    it('rejects any edit when the parent session is abandoned', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        id: SESSION_ID,
        counselorStaffId: STAFF_ID,
        studentId: 'student-uuid',
        caseNumber: 'SC-20260723-001',
        status: MhaSessionStatus.ABANDONED,
      });
      domainResultRepo.findOne!.mockResolvedValue(buildRow());

      await expect(
        service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.LOW }, STAFF_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(domainResultRepo.save).not.toHaveBeenCalled();
    });

    it('allows edits when the parent session is still draft (regression guard)', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow());
      const result = await service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.LOW }, STAFF_ID);
      expect(result.level).toBe(DomainResultLevel.LOW);
      expect(domainResultRepo.save).toHaveBeenCalled();
    });
  });

  describe('update — never derives level from checkedSymptoms (AI-prompt test b, AC #27)', () => {
    it('leaves level unchanged at not_assessed when only checkedSymptoms is patched (3 symptoms)', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ level: DomainResultLevel.NOT_ASSESSED }));
      const result = await service.update(SESSION_ID, ROW_ID, { checkedSymptoms: ['a', 'b', 'c'] }, STAFF_ID);
      expect(result.level).toBe(DomainResultLevel.NOT_ASSESSED);
      expect(result.checkedSymptoms).toEqual(['a', 'b', 'c']);
    });

    it('leaves level unchanged at low when only checkedSymptoms is patched (proves it is not reset either)', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ level: DomainResultLevel.LOW, checkedSymptoms: ['x'] }));
      const result = await service.update(SESSION_ID, ROW_ID, { checkedSymptoms: ['x', 'y'] }, STAFF_ID);
      expect(result.level).toBe(DomainResultLevel.LOW);
    });

    it('sets level only when dto.level is explicitly present in the body', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ level: DomainResultLevel.NOT_ASSESSED }));
      const result = await service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.SEVERE }, STAFF_ID);
      expect(result.level).toBe(DomainResultLevel.SEVERE);
    });

    it('accepts level above none with zero checkedSymptoms — AC #24 soft validation is UI-only, backend never blocks', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ checkedSymptoms: [] }));
      const result = await service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.MODERATE, checkedSymptoms: [] }, STAFF_ID);
      expect(result.level).toBe(DomainResultLevel.MODERATE);
    });
  });

  describe('update — assessedAt', () => {
    it('sets assessedAt when level changes', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ assessedAt: null }));
      const result = await service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.LOW }, STAFF_ID);
      expect(result.assessedAt).toBeInstanceOf(Date);
    });

    it('sets assessedAt when checkedSymptoms changes', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ assessedAt: null }));
      const result = await service.update(SESSION_ID, ROW_ID, { checkedSymptoms: ['a'] }, STAFF_ID);
      expect(result.assessedAt).toBeInstanceOf(Date);
    });

    it('leaves assessedAt untouched when only counselorNotes changes', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ assessedAt: null }));
      const result = await service.update(SESSION_ID, ROW_ID, { counselorNotes: 'watching closely' }, STAFF_ID);
      expect(result.assessedAt).toBeNull();
      expect(result.counselorNotes).toBe('decrypted plaintext');
    });
  });

  describe('update — counselorNotes encryption (MHA-121, AC #2/#4)', () => {
    it('encrypts a non-null string before persisting — never writes plaintext to the row', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow());
      const result = await service.update(
        SESSION_ID,
        ROW_ID,
        { counselorNotes: 'Student mentioned family stress, not disclosed to guardian yet.' },
        STAFF_ID,
      );

      expect(cryptoService.encrypt).toHaveBeenCalledWith(
        'Student mentioned family stress, not disclosed to guardian yet.',
      );
      const savedArg = (domainResultRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedArg.counselorNotesCiphertext).toBe('CIPHER');
      expect(savedArg.counselorNotesIv).toBe('IV_HEX');
      expect(savedArg.counselorNotesAuthTag).toBe('TAG_HEX');
      expect(savedArg.counselorNotesCiphertext).not.toBe(
        'Student mentioned family stress, not disclosed to guardian yet.',
      );
      expect(result.counselorNotes).toBe('decrypted plaintext');
    });

    it('clears all three encrypted columns when counselorNotes is explicitly set to null, without calling encrypt', async () => {
      domainResultRepo.findOne!.mockResolvedValue(
        buildRow({
          counselorNotesCiphertext: 'OLD_CIPHER',
          counselorNotesIv: 'OLD_IV',
          counselorNotesAuthTag: 'OLD_TAG',
        }),
      );
      const result = await service.update(SESSION_ID, ROW_ID, { counselorNotes: null }, STAFF_ID);

      expect(cryptoService.encrypt).not.toHaveBeenCalled();
      const savedArg = (domainResultRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedArg.counselorNotesCiphertext).toBeNull();
      expect(savedArg.counselorNotesIv).toBeNull();
      expect(savedArg.counselorNotesAuthTag).toBeNull();
      expect(result.counselorNotes).toBeNull();
    });

    it('leaves the encrypted columns untouched when counselorNotes is omitted from the DTO', async () => {
      domainResultRepo.findOne!.mockResolvedValue(
        buildRow({
          counselorNotesCiphertext: 'EXISTING_CIPHER',
          counselorNotesIv: 'EXISTING_IV',
          counselorNotesAuthTag: 'EXISTING_TAG',
        }),
      );
      await service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.LOW }, STAFF_ID);

      expect(cryptoService.encrypt).not.toHaveBeenCalled();
      const savedArg = (domainResultRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedArg.counselorNotesCiphertext).toBe('EXISTING_CIPHER');
      expect(savedArg.counselorNotesIv).toBe('EXISTING_IV');
      expect(savedArg.counselorNotesAuthTag).toBe('EXISTING_TAG');
    });
  });

  describe('update — safety flag (MHA-122)', () => {
    it('AI-prompt test (a): escalation fires before the domain_result row is saved', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ safetyFlagRaised: false }));
      await service.update(SESSION_ID, ROW_ID, { safetyFlagRaised: true }, STAFF_ID);

      const escalateOrder = safetyFlagEscalationService.escalate.mock.invocationCallOrder[0];
      const saveOrder = (domainResultRepo.save as jest.Mock).mock.invocationCallOrder[0];
      expect(escalateOrder).toBeLessThan(saveOrder);
    });

    it('AI-prompt test (b): safetyFlagRaised cannot be set to false after being set to true (422)', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ safetyFlagRaised: true }));
      await expect(
        service.update(SESSION_ID, ROW_ID, { safetyFlagRaised: false }, STAFF_ID),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(domainResultRepo.save).not.toHaveBeenCalled();
      expect(safetyFlagEscalationService.escalate).not.toHaveBeenCalled();
    });

    it('rejects raising the flag on a domain that does not carry DisorderRegistry.safetyFlag', async () => {
      domainResultRepo.findOne!.mockResolvedValue(
        buildRow({ safetyFlagRaised: false, domainId: 'domain-adhd' }),
      );
      disorderRegistryRepo.findOne!.mockResolvedValue({ id: 'domain-adhd', safetyFlag: false });

      await expect(
        service.update(SESSION_ID, ROW_ID, { safetyFlagRaised: true }, STAFF_ID),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(safetyFlagEscalationService.escalate).not.toHaveBeenCalled();
    });

    it('does not re-trigger escalation on a true->true re-submission', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ safetyFlagRaised: true }));
      await service.update(SESSION_ID, ROW_ID, { safetyFlagRaised: true }, STAFF_ID);

      expect(safetyFlagEscalationService.escalate).not.toHaveBeenCalled();
      expect(domainResultRepo.save).toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: 'raise_safety_flag' }),
      );
    });

    it('happy path: false->true escalates with session context, returns crisisResources, logs both audit entries', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ safetyFlagRaised: false }));
      const result = await service.update(SESSION_ID, ROW_ID, { safetyFlagRaised: true }, STAFF_ID);

      expect(safetyFlagEscalationService.escalate).toHaveBeenCalledWith({
        counselorStaffId: STAFF_ID,
        studentId: 'student-uuid',
        sessionId: SESSION_ID,
        caseNumber: 'SC-20260723-001',
      });
      expect(result.crisisResources).toEqual(CRISIS_RESOURCES);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'raise_safety_flag', targetType: 'domain_result' }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'update_domain', targetType: 'domain_result' }),
      );
    });

    it('omitting safetyFlagRaised never calls escalate and leaves crisisResources undefined', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow({ safetyFlagRaised: false }));
      const result = await service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.LOW }, STAFF_ID);

      expect(safetyFlagEscalationService.escalate).not.toHaveBeenCalled();
      expect(result.crisisResources).toBeUndefined();
    });
  });

  describe('update — persistence and audit', () => {
    it('saves the row and logs an audit entry', async () => {
      domainResultRepo.findOne!.mockResolvedValue(buildRow());
      await service.update(SESSION_ID, ROW_ID, { level: DomainResultLevel.HIGH }, STAFF_ID);
      expect(domainResultRepo.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith({
        actorId: STAFF_ID,
        action: 'update_domain',
        targetType: 'domain_result',
        targetId: ROW_ID,
      });
    });

    it('throws NotFoundException when the id does not belong to the session', async () => {
      domainResultRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.update(SESSION_ID, 'other-session-id', {}, STAFF_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('listBySession', () => {
    it('returns rows joined with domain, ordered by section then name, notes decrypted', async () => {
      listGetManyResult = [buildRow()];
      const result = await service.listBySession(SESSION_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(ROW_ID);
      expect(result[0].sessionId).toBe(SESSION_ID);
      expect(result[0].level).toBe(DomainResultLevel.NOT_ASSESSED);
      // buildRow() defaults counselorNotesCiphertext to null — decrypt() must not be called,
      // and the mapped response's counselorNotes must be null (not the crypto mock's stub value).
      expect(result[0].counselorNotes).toBeNull();
      expect(cryptoService.decrypt).not.toHaveBeenCalled();
    });

    it('decrypts counselorNotes when a row has stored ciphertext', async () => {
      listGetManyResult = [
        buildRow({
          counselorNotesCiphertext: 'CIPHER',
          counselorNotesIv: 'IV_HEX',
          counselorNotesAuthTag: 'TAG_HEX',
        }),
      ];
      const result = await service.listBySession(SESSION_ID);
      expect(cryptoService.decrypt).toHaveBeenCalledWith('CIPHER', 'IV_HEX', 'TAG_HEX');
      expect(result[0].counselorNotes).toBe('decrypted plaintext');
    });

    it('throws NotFoundException for an unknown session', async () => {
      sessionRepo.findOne!.mockResolvedValue(undefined);
      await expect(service.listBySession('missing-session')).rejects.toThrow(NotFoundException);
    });
  });
});
